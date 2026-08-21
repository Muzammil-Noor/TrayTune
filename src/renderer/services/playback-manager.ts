import type { RepeatMode, Track, TrackId } from "@shared/types";

/**
 * Central playback engine (PRD §29, task 4.1): owns the html Audio element,
 * the playback queue, and every transport operation — load, play, pause,
 * stop, seek, next, previous, setVolume, getState — plus the shuffle and
 * repeat policy (tasks 4.11–4.13). UI layers subscribe to state snapshots
 * and call methods; nothing else touches the audio element.
 *
 * Queue model (PRD §30): `queue` keeps the tracks in the order they were
 * played from (a snapshot of the view — playlist data is never reordered);
 * `order` is the play order over it (identity, or shuffled with the current
 * track first) and `cursor` walks `order`. Shuffle only ever rewrites
 * `order`, which is what makes it reversible and non-destructive.
 *
 * Runs in the main window's renderer: that window is the app's player-state
 * owner (see player-bus in main) and stays alive in the tray, so audio
 * survives hiding the window. Audio bytes stream over the traytune-audio://
 * protocol — the manager only ever addresses tracks by library id.
 */

export interface PlaybackState {
  /** Track at the queue cursor; null when nothing is loaded. */
  track: Track | null;
  isPlaying: boolean;
  /** Playback position in seconds. */
  position: number;
  /** Real duration from the audio engine; null until metadata is known. */
  duration: number | null;
  /** 0..1 */
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Non-fatal failure playing the current track (PRD §45). */
  error: string | null;
}

const AUDIO_URL_PREFIX = "traytune-audio://track/";

/** Previous restarts the current track once it has really started playing;
 * before that it goes to the previous track (standard player behavior). */
const PREVIOUS_RESTARTS_AFTER_SECONDS = 3;

export class PlaybackManager {
  private audio = new Audio();
  private queue: Track[] = [];
  /** Play order: indices into `queue`. Identity, or shuffled. */
  private order: number[] = [];
  /** Position within `order`; -1 when nothing is loaded. */
  private cursor = -1;
  private shuffleEnabled = false;
  private repeat: RepeatMode = "off";
  private listeners = new Set<() => void>();
  private error: string | null = null;
  /** Consecutive failed tracks — bounds the error auto-skip (PRD §45). */
  private errorStreak = 0;
  /** Cached immutable snapshot — required by useSyncExternalStore. */
  private state: PlaybackState = {
    track: null,
    isPlaying: false,
    position: 0,
    duration: null,
    volume: 1,
    muted: false,
    shuffle: false,
    repeat: "off",
    error: null,
  };

  constructor() {
    this.audio.preload = "auto";
    const emit = () => this.emit();
    for (const event of [
      "play",
      "pause",
      "timeupdate",
      "durationchange",
      "loadedmetadata",
      "volumechange",
      "emptied",
    ]) {
      this.audio.addEventListener(event, emit);
    }
    this.audio.addEventListener("playing", () => {
      // Something is audibly playing — any earlier failure is history.
      this.errorStreak = 0;
      this.error = null;
      emit();
    });
    this.audio.addEventListener("ended", () => this.handleEnded());
    this.audio.addEventListener("error", () => this.handleError());
  }

  /** Both are stable references for useSyncExternalStore. */
  getState = (): PlaybackState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts playing tracks[index], making the list the new playback queue.
   * The queue is a snapshot: browsing another playlist afterwards must not
   * hijack next/previous (queue ≠ view, PRD §30). */
  playQueue(tracks: Track[], index: number): void {
    if (index < 0 || index >= tracks.length) return;
    this.queue = [...tracks];
    this.errorStreak = 0;
    this.rebuildOrder(index);
    this.playAtCursor();
  }

  play(): void {
    if (!this.audio.src) return;
    void this.audio.play().catch(() => {
      /* the error event reports failures */
    });
  }

  pause(): void {
    this.audio.pause();
  }

  toggle(): void {
    if (this.audio.paused) this.play();
    else this.pause();
  }

  /** Fully unloads: releases the file and clears the queue (PRD §66 wants
   * playback stopped on quit; also used when the playing track disappears). */
  stop(): void {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.queue = [];
    this.order = [];
    this.cursor = -1;
    this.error = null;
    this.errorStreak = 0;
    this.emit();
  }

  /** Task 4.7 — works both while playing and while paused. */
  seek(seconds: number): void {
    if (!this.audio.src || !Number.isFinite(seconds)) return;
    const duration = this.audio.duration;
    const max = Number.isFinite(duration) ? duration : seconds;
    this.audio.currentTime = Math.min(Math.max(seconds, 0), max);
    this.emit();
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.min(Math.max(volume, 0), 1);
    if (this.audio.volume > 0) this.audio.muted = false;
  }

  toggleMute(): void {
    this.audio.muted = !this.audio.muted;
    this.emit(); // `muted` has no dedicated media event on all paths
  }

  /** Task 4.6/4.12 — at the queue's end, Repeat Playlist wraps to the start;
   * otherwise playback stops there. */
  next(): void {
    if (this.cursor + 1 < this.order.length) {
      this.cursor += 1;
      this.playAtCursor();
    } else if (this.repeat === "all" && this.order.length > 0) {
      this.cursor = 0;
      this.playAtCursor();
    } else {
      this.stopAtEnd();
    }
  }

  /** Task 4.5 — restart the current track when it has really started;
   * otherwise go back. On the first track: wrap when repeating the
   * playlist, else restart (nowhere earlier to go). */
  previous(): void {
    if (this.audio.currentTime > PREVIOUS_RESTARTS_AFTER_SECONDS) {
      this.seek(0);
    } else if (this.cursor > 0) {
      this.cursor -= 1;
      this.playAtCursor();
    } else if (this.repeat === "all" && this.order.length > 1) {
      this.cursor = this.order.length - 1;
      this.playAtCursor();
    } else {
      this.seek(0);
    }
  }

  /** Task 4.13 — flips shuffle by rewriting the play order around the
   * current track, which keeps playing untouched (PRD §10.6). */
  toggleShuffle(): void {
    this.shuffleEnabled = !this.shuffleEnabled;
    this.rebuildOrder(this.currentQueueIndex());
    this.emit();
  }

  /** Tasks 4.11/4.12 — takes effect on the next track boundary. */
  setRepeat(mode: RepeatMode): void {
    this.repeat = mode;
    this.emit();
  }

  /** The library changed: stop if the playing track was removed, and drop
   * removed tracks from queue and play order (preserving the order walked
   * so far) so next/previous never reach them. */
  syncWithLibrary(validIds: ReadonlySet<TrackId>): void {
    const current = this.queue[this.order[this.cursor]];
    if (current && !validIds.has(current.id)) {
      this.stop();
      return;
    }
    if (!this.queue.some((track) => !validIds.has(track.id))) return;

    const indexMap = new Map<number, number>();
    const nextQueue: Track[] = [];
    this.queue.forEach((track, index) => {
      if (validIds.has(track.id)) {
        indexMap.set(index, nextQueue.length);
        nextQueue.push(track);
      }
    });
    const nextOrder: number[] = [];
    let nextCursor = -1;
    this.order.forEach((queueIndex, position) => {
      const mapped = indexMap.get(queueIndex);
      if (mapped !== undefined) {
        if (position === this.cursor) nextCursor = nextOrder.length;
        nextOrder.push(mapped);
      }
    });
    this.queue = nextQueue;
    this.order = nextOrder;
    this.cursor = nextCursor;
    this.emit();
  }

  private currentQueueIndex(): number | null {
    return this.cursor >= 0 ? (this.order[this.cursor] ?? null) : null;
  }

  /** Builds `order` for the current shuffle setting. `anchor` (a queue
   * index) plays first — the just-clicked or currently playing track. */
  private rebuildOrder(anchor: number | null): void {
    const indices = this.queue.map((_, index) => index);
    if (!this.shuffleEnabled) {
      this.order = indices;
      this.cursor = anchor ?? -1;
      return;
    }
    const rest = indices.filter((index) => index !== anchor);
    // Fisher–Yates
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.order = anchor !== null ? [anchor, ...rest] : rest;
    this.cursor = anchor !== null ? 0 : -1;
  }

  private playAtCursor(): void {
    const track = this.queue[this.order[this.cursor]];
    if (!track) return;
    this.error = null;
    this.audio.src = AUDIO_URL_PREFIX + encodeURIComponent(track.id);
    this.play();
    this.emit();
  }

  /** Task 4.10/4.11 — Repeat One replays the finished track; otherwise
   * advance (Repeat Playlist wraps, off stops at the end). PRD §56. */
  private handleEnded(): void {
    if (this.repeat === "one" && this.audio.src) {
      this.seek(0);
      this.play();
    } else {
      this.next();
    }
  }

  /** Task 4.16 — a track that cannot play is an error state, not a crash:
   * report it and move on to the next track, but give up after one full
   * round of failures so two broken files cannot ping-pong forever. */
  private handleError(): void {
    if (!this.audio.src) return; // deliberately clearing src also fires error
    this.error = "Couldn't play this file.";
    this.errorStreak += 1;
    if (this.errorStreak < this.order.length && this.cursor >= 0) {
      this.next();
      // next()/stopAtEnd cleared it, but the listener should keep seeing the
      // failure until something actually plays.
      this.error = "Couldn't play this file.";
    }
    this.emit();
  }

  /** End of the queue: keep the last track loaded and visible, paused at the
   * start, instead of tearing the player down. */
  private stopAtEnd(): void {
    this.audio.pause();
    if (this.audio.src && !Number.isNaN(this.audio.duration)) {
      this.audio.currentTime = 0;
    }
    this.emit();
  }

  private emit(): void {
    const duration = this.audio.duration;
    this.state = {
      track: this.queue[this.order[this.cursor]] ?? null,
      isPlaying: !this.audio.paused && !this.audio.ended,
      position: this.audio.currentTime,
      duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      volume: this.audio.volume,
      muted: this.audio.muted,
      shuffle: this.shuffleEnabled,
      repeat: this.repeat,
      error: this.error,
    };
    for (const listener of this.listeners) listener();
  }
}

let manager: PlaybackManager | null = null;

/** The app has exactly one audio pipeline. */
export function getPlaybackManager(): PlaybackManager {
  manager ??= new PlaybackManager();
  return manager;
}

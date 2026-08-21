import type { Track, TrackId } from "@shared/types";

/**
 * Central playback engine (PRD §29, task 4.1): owns the html Audio element,
 * the playback queue, and every transport operation — load, play, pause,
 * stop, seek, next, previous, setVolume, getState. UI layers subscribe to
 * state snapshots and call methods; nothing else touches the audio element.
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
  private index = -1;
  private listeners = new Set<() => void>();
  private error: string | null = null;
  /** Cached immutable snapshot — required by useSyncExternalStore. */
  private state: PlaybackState = {
    track: null,
    isPlaying: false,
    position: 0,
    duration: null,
    volume: 1,
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
    this.audio.addEventListener("ended", () => this.handleEnded());
    this.audio.addEventListener("error", () => {
      // Deliberately clearing src also fires an error — that one is not news.
      if (!this.audio.src) return;
      this.error = "Couldn't play this file.";
      this.emit();
    });
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
    this.playAt(index);
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
    this.index = -1;
    this.error = null;
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
  }

  /** Task 4.6 — on the last track there is nowhere to go: stop at the end.
   * Repeat modes change this in tasks 4.11/4.12. */
  next(): void {
    if (this.index + 1 < this.queue.length) {
      this.playAt(this.index + 1);
    } else {
      this.stopAtEnd();
    }
  }

  /** Task 4.5 — restart the current track when it has really started;
   * otherwise go back, and on the first track restart it (nowhere earlier). */
  previous(): void {
    if (
      this.audio.currentTime > PREVIOUS_RESTARTS_AFTER_SECONDS ||
      this.index <= 0
    ) {
      this.seek(0);
    } else {
      this.playAt(this.index - 1);
    }
  }

  /** The library changed: stop if the playing track was removed, and drop
   * removed tracks from the queue so next/previous never reach them. */
  syncWithLibrary(validIds: ReadonlySet<TrackId>): void {
    const current = this.queue[this.index];
    if (current && !validIds.has(current.id)) {
      this.stop();
      return;
    }
    if (this.queue.some((track) => !validIds.has(track.id))) {
      this.queue = this.queue.filter((track) => validIds.has(track.id));
      this.index = current
        ? this.queue.findIndex((track) => track.id === current.id)
        : -1;
      this.emit();
    }
  }

  private playAt(index: number): void {
    const track = this.queue[index];
    if (!track) return;
    this.index = index;
    this.error = null;
    this.audio.src = AUDIO_URL_PREFIX + encodeURIComponent(track.id);
    this.play();
    this.emit();
  }

  /** Task 4.10 — a finished track advances automatically; the queue's last
   * track ends playback (repeat "off" behavior, PRD §10.7). */
  private handleEnded(): void {
    this.next();
  }

  /** End of the queue: keep the last track loaded and visible, paused at the
   * start, instead of tearing the player down. */
  private stopAtEnd(): void {
    this.audio.pause();
    if (this.audio.src) this.audio.currentTime = 0;
    this.emit();
  }

  private emit(): void {
    const duration = this.audio.duration;
    this.state = {
      track: this.queue[this.index] ?? null,
      isPlaying: !this.audio.paused && !this.audio.ended,
      position: this.audio.currentTime,
      duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      volume: this.audio.volume,
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

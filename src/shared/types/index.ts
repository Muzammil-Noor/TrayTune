export type TrackId = string;
export type PlaylistId = string;

export interface Track {
  id: TrackId;
  title: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  /** Duration in seconds. */
  duration?: number;
  filePath: string;
  artworkPath?: string;
  createdAt: number;
}

export interface Playlist {
  id: PlaylistId;
  name: string;
  trackIds: TrackId[];
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = "off" | "all" | "one";

export interface AppSettings {
  /** When true, the window's close button hides to the tray instead of quitting. */
  closeToTray: boolean;
}

/** Player actions that can originate outside the main window (tray menu,
 * flyout, later media keys). The main window's player applies them. */
export type PlayerAction =
  | { type: "play-pause" }
  | { type: "previous" }
  | { type: "next" }
  | { type: "toggle-shuffle" }
  | { type: "cycle-repeat" }
  | { type: "seek"; position: number }
  | { type: "play-track"; trackId: TrackId }
  | { type: "select-playlist"; playlistId: PlaylistId }
  | { type: "remove-from-playlist"; trackId: TrackId }
  | { type: "remove-from-library"; trackId: TrackId };

/** Snapshot of the player state the main window reports; the tray display and
 * the flyout window render from this single source (PRD §10.4 — no forked
 * playback state between windows). */
export interface PlayerStateSnapshot {
  playlists: { id: PlaylistId; name: string; trackCount: number }[];
  selectedPlaylistId: PlaylistId | null;
  /** Resolved tracks of the selected playlist, in playlist order. */
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

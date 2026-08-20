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

/** The metadata fields library.updateTrack may change. Identity and file
 * fields (id, filePath, createdAt) are never patchable over IPC. */
export type TrackMetadataPatch = Partial<
  Pick<
    Track,
    | "title"
    | "artist"
    | "album"
    | "albumArtist"
    | "genre"
    | "year"
    | "trackNumber"
  >
>;

/** Outcome of a library import (PRD §51: per-file failures must not block
 * the rest of the batch). */
export interface AddTracksResult {
  added: Track[];
  /** Files skipped because their exact path is already in the library. */
  duplicateCount: number;
  /** Files that could not be imported at all. */
  failedCount: number;
  /** True when the user dismissed the file picker. */
  canceled: boolean;
}

export type RepeatMode = "off" | "all" | "one";

/** How TrayTune presents itself when launched at Windows sign-in:
 * "tray" stays hidden with the tray/flyout ready; "window" opens the main
 * window. Manual launches always show the main window. */
export type StartupMode = "tray" | "window";

export interface AppSettings {
  /** When true, the window's close button hides to the tray instead of quitting. */
  closeToTray: boolean;
  /** Launch TrayTune when the user signs in to Windows. Backed by the OS
   * login-item registration, not settings.json — the OS is the source of
   * truth so Task Manager changes stay honest. */
  runOnStartup: boolean;
  /** Only takes effect for sign-in launches (see runOnStartup). */
  startupMode: StartupMode;
  /** Flyout: close the playlist drawer after selecting a playlist. */
  flyoutCollapseSidebarOnSelect: boolean;
  /** Flyout: collapse the song list back to compact mode after picking a song. */
  flyoutCollapseSongListOnPlay: boolean;
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
  /** null selects the Library view (all tracks). */
  | { type: "select-playlist"; playlistId: PlaylistId | null }
  | { type: "remove-from-playlist"; trackId: TrackId }
  | { type: "remove-from-library"; trackId: TrackId };

/** Snapshot of the player state the main window reports; the tray display and
 * the flyout window render from this single source (PRD §10.4 — no forked
 * playback state between windows). */
export interface PlayerStateSnapshot {
  playlists: { id: PlaylistId; name: string; trackCount: number }[];
  /** null means the Library view (all tracks) is selected. */
  selectedPlaylistId: PlaylistId | null;
  /** Total library size, for the flyout's Library entry. */
  libraryTrackCount: number;
  /** Resolved tracks of the selected playlist (or the whole library), in order. */
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

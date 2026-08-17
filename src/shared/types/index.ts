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

/** Playback actions the main process (tray menu, later media keys) can send
 * to the player. */
export type PlayerCommand = "play-pause" | "previous" | "next";

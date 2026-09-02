import type {
  AddTracksResult,
  AppSettings,
  PlayerAction,
  PlayerStateSnapshot,
  Playlist,
  Track,
  TrackMetadataPatch,
} from "../shared/types";

export interface TrayTuneApi {
  readonly platform: string;
  readonly system: {
    /** Windows accent color as #rrggbb, or null when unavailable. */
    getAccentColor(): Promise<string | null>;
    /** Subscribes to live accent changes; returns an unsubscribe function. */
    onAccentColorChanged(callback: (color: string) => void): () => void;
  };
  readonly settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
    /** Fires in every window whenever settings change. Returns unsubscribe. */
    onChanged(callback: (settings: AppSettings) => void): () => void;
  };
  readonly library: {
    getTracks(): Promise<Track[]>;
    /** Without paths: opens the file picker. With paths (drag-and-drop later):
     * imports them directly. */
    addTracks(paths?: string[]): Promise<AddTracksResult>;
    removeTrack(trackId: string): Promise<boolean>;
    updateTrack(trackId: string, patch: TrackMetadataPatch): Promise<Track | null>;
    /** Fires in every window with the full track list after any change.
     * Returns unsubscribe. */
    onChanged(callback: (tracks: Track[]) => void): () => void;
  };
  readonly playlists: {
    getAll(): Promise<Playlist[]>;
    /** Returns the created playlist, or null for an unusable (empty) name. */
    create(name: string): Promise<Playlist | null>;
    rename(playlistId: string, name: string): Promise<Playlist | null>;
    remove(playlistId: string): Promise<boolean>;
    /** Successful no-op when the track is already in the playlist. */
    addTrack(playlistId: string, trackId: string): Promise<Playlist | null>;
    /** The track stays in the library — different operation from removal. */
    removeTrack(playlistId: string, trackId: string): Promise<Playlist | null>;
    /** Moves one track within a playlist. */
    reorder(
      playlistId: string,
      fromIndex: number,
      toIndex: number,
    ): Promise<Playlist | null>;
    /** Creates a new playlist from both; the originals are kept. */
    merge(
      firstId: string,
      secondId: string,
      name: string,
    ): Promise<Playlist | null>;
    /** Fires in every window with the full playlist list after any change.
     * Returns unsubscribe. */
    onChanged(callback: (playlists: Playlist[]) => void): () => void;
  };
  readonly player: {
    /** Main window: actions from the tray menu / flyout. Returns unsubscribe. */
    onAction(callback: (action: PlayerAction) => void): () => void;
    /** Flyout: send an action for the main window's player to apply. */
    sendAction(action: PlayerAction): void;
    /** Main window: report the full player state after every change. */
    reportState(snapshot: PlayerStateSnapshot): void;
    /** Flyout: receive player state snapshots. Returns unsubscribe. */
    onState(callback: (snapshot: PlayerStateSnapshot) => void): () => void;
    /** Flyout: pull the latest snapshot on mount (push alone can race). */
    getState(): Promise<PlayerStateSnapshot | null>;
  };
  readonly flyout: {
    hide(): void;
    toggle(): void;
    openMainWindow(): void;
  };
}

declare global {
  interface Window {
    traytune: TrayTuneApi;
  }
}

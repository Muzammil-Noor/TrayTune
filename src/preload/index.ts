import { contextBridge, ipcRenderer } from "electron";
import type {
  AddTracksResult,
  AppSettings,
  PlayerAction,
  PlayerStateSnapshot,
  Playlist,
  Track,
  TrackMetadataPatch,
} from "../shared/types";

// Minimal typed surface for the renderer. Feature APIs (library.*, playlist.*,
// youtube.*, …) are added here phase by phase — never expose ipcRenderer or
// Node APIs directly.
const api = {
  platform: process.platform as string,
  system: {
    getAccentColor: (): Promise<string | null> =>
      ipcRenderer.invoke("system:get-accent-color"),
    onAccentColorChanged: (callback: (color: string) => void): (() => void) => {
      const listener = (_event: unknown, color: string) => callback(color);
      ipcRenderer.on("system:accent-color-changed", listener);
      return () =>
        ipcRenderer.removeListener("system:accent-color-changed", listener);
    },
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
    update: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke("settings:update", patch),
    onChanged: (callback: (settings: AppSettings) => void): (() => void) => {
      const listener = (_event: unknown, settings: AppSettings) =>
        callback(settings);
      ipcRenderer.on("settings:changed", listener);
      return () => ipcRenderer.removeListener("settings:changed", listener);
    },
  },
  library: {
    getTracks: (): Promise<Track[]> => ipcRenderer.invoke("library:get-tracks"),
    /** Without paths: opens the file picker. With paths (drag-and-drop later):
     * imports them directly. */
    addTracks: (paths?: string[]): Promise<AddTracksResult> =>
      ipcRenderer.invoke("library:add-tracks", paths),
    removeTrack: (trackId: string): Promise<boolean> =>
      ipcRenderer.invoke("library:remove-track", trackId),
    updateTrack: (
      trackId: string,
      patch: TrackMetadataPatch,
    ): Promise<Track | null> =>
      ipcRenderer.invoke("library:update-track", trackId, patch),
    /** Fires in every window with the full track list after any change. */
    onChanged: (callback: (tracks: Track[]) => void): (() => void) => {
      const listener = (_event: unknown, tracks: Track[]) => callback(tracks);
      ipcRenderer.on("library:changed", listener);
      return () => ipcRenderer.removeListener("library:changed", listener);
    },
  },
  playlists: {
    getAll: (): Promise<Playlist[]> => ipcRenderer.invoke("playlist:get-all"),
    create: (name: string): Promise<Playlist | null> =>
      ipcRenderer.invoke("playlist:create", name),
    rename: (playlistId: string, name: string): Promise<Playlist | null> =>
      ipcRenderer.invoke("playlist:rename", playlistId, name),
    remove: (playlistId: string): Promise<boolean> =>
      ipcRenderer.invoke("playlist:delete", playlistId),
    addTrack: (playlistId: string, trackId: string): Promise<Playlist | null> =>
      ipcRenderer.invoke("playlist:add-track", playlistId, trackId),
    removeTrack: (
      playlistId: string,
      trackId: string,
    ): Promise<Playlist | null> =>
      ipcRenderer.invoke("playlist:remove-track", playlistId, trackId),
    reorder: (
      playlistId: string,
      fromIndex: number,
      toIndex: number,
    ): Promise<Playlist | null> =>
      ipcRenderer.invoke("playlist:reorder", playlistId, fromIndex, toIndex),
    /** Creates a new playlist from both; the originals are kept. */
    merge: (
      firstId: string,
      secondId: string,
      name: string,
    ): Promise<Playlist | null> =>
      ipcRenderer.invoke("playlist:merge", firstId, secondId, name),
    /** Fires in every window with the full playlist list after any change. */
    onChanged: (callback: (playlists: Playlist[]) => void): (() => void) => {
      const listener = (_event: unknown, playlists: Playlist[]) =>
        callback(playlists);
      ipcRenderer.on("playlists:changed", listener);
      return () => ipcRenderer.removeListener("playlists:changed", listener);
    },
  },
  player: {
    /** Main window: receive actions from the tray/flyout. */
    onAction: (callback: (action: PlayerAction) => void): (() => void) => {
      const listener = (_event: unknown, action: PlayerAction) =>
        callback(action);
      ipcRenderer.on("player:command", listener);
      return () => ipcRenderer.removeListener("player:command", listener);
    },
    /** Flyout: send an action for the main window's player to apply. */
    sendAction: (action: PlayerAction): void => {
      ipcRenderer.send("player:action", action);
    },
    /** Main window: report the full player state after every change. */
    reportState: (snapshot: PlayerStateSnapshot): void => {
      ipcRenderer.send("player:state-report", snapshot);
    },
    /** Flyout: receive player state snapshots. */
    onState: (
      callback: (snapshot: PlayerStateSnapshot) => void,
    ): (() => void) => {
      const listener = (_event: unknown, snapshot: PlayerStateSnapshot) =>
        callback(snapshot);
      ipcRenderer.on("player:state", listener);
      return () => ipcRenderer.removeListener("player:state", listener);
    },
    /** Flyout: pull the latest snapshot on mount (push alone can race). */
    getState: (): Promise<PlayerStateSnapshot | null> =>
      ipcRenderer.invoke("player:get-state"),
  },
  flyout: {
    hide: (): void => {
      ipcRenderer.send("flyout:hide");
    },
    toggle: (): void => {
      ipcRenderer.send("flyout:toggle");
    },
    /** Report the card's height so main knows which part of the window is
     * interactive; the rest is transparent and passes clicks through. */
    setCardHeight: (height: number): void => {
      ipcRenderer.send("flyout:set-card-height", height);
    },
    /** Main asks the renderer to confirm it has painted before revealing. */
    onShown: (callback: () => void): (() => void) => {
      const listener = () => callback();
      ipcRenderer.on("flyout:shown", listener);
      return () => ipcRenderer.removeListener("flyout:shown", listener);
    },
    notifyReady: (): void => {
      ipcRenderer.send("flyout:ready");
    },
    openMainWindow: (): void => {
      ipcRenderer.send("flyout:open-main-window");
    },
  },
};

contextBridge.exposeInMainWorld("traytune", api);

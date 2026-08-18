import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  PlayerAction,
  PlayerStateSnapshot,
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
  },
  flyout: {
    hide: (): void => {
      ipcRenderer.send("flyout:hide");
    },
    toggle: (): void => {
      ipcRenderer.send("flyout:toggle");
    },
    openMainWindow: (): void => {
      ipcRenderer.send("flyout:open-main-window");
    },
  },
};

contextBridge.exposeInMainWorld("traytune", api);

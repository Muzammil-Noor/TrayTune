import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  NowPlayingInfo,
  PlayerCommand,
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
    onCommand: (callback: (command: PlayerCommand) => void): (() => void) => {
      const listener = (_event: unknown, command: PlayerCommand) =>
        callback(command);
      ipcRenderer.on("player:command", listener);
      return () => ipcRenderer.removeListener("player:command", listener);
    },
    reportNowPlaying: (info: NowPlayingInfo | null): void => {
      ipcRenderer.send("player:now-playing", info);
    },
  },
};

contextBridge.exposeInMainWorld("traytune", api);

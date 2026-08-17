import { contextBridge, ipcRenderer } from "electron";

// Minimal typed surface for the renderer. Feature APIs (library.*, playlist.*,
// player.*, settings.*, youtube.*) are added here phase by phase — never expose
// ipcRenderer or Node APIs directly.
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
};

contextBridge.exposeInMainWorld("traytune", api);

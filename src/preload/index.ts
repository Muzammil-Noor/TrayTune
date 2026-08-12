import { contextBridge } from "electron";

// Minimal typed surface for the renderer. Feature APIs (library.*, playlist.*,
// player.*, settings.*, youtube.*) are added here phase by phase — never expose
// ipcRenderer or Node APIs directly.
const api = {
  platform: process.platform as string,
};

contextBridge.exposeInMainWorld("traytune", api);

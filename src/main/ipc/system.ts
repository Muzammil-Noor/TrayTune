import { BrowserWindow, ipcMain, systemPreferences } from "electron";

function accentAsHex(): string | null {
  try {
    // Electron returns RRGGBBAA on Windows; strip alpha.
    return `#${systemPreferences.getAccentColor().slice(0, 6)}`;
  } catch {
    return null; // renderer falls back to its default accent
  }
}

export function registerSystemIpc(): void {
  ipcMain.handle("system:get-accent-color", () => accentAsHex());

  systemPreferences.on("accent-color-changed", () => {
    const color = accentAsHex();
    if (!color) return;
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("system:accent-color-changed", color);
    }
  });
}

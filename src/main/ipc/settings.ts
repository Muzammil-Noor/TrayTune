import { BrowserWindow, ipcMain } from "electron";
import type { AppSettings } from "../../shared/types";
import { getSettings, updateSettings } from "../services/settings";

const BOOLEAN_KEYS = [
  "closeToTray",
  "runOnStartup",
  "flyoutCollapseSidebarOnSelect",
  "flyoutCollapseSongListOnPlay",
] as const;

/** Accepts only known keys with correct types — IPC input is untrusted. */
function sanitize(patch: unknown): Partial<AppSettings> {
  const result: Partial<AppSettings> = {};
  if (typeof patch === "object" && patch !== null) {
    const record = patch as Record<string, unknown>;
    for (const key of BOOLEAN_KEYS) {
      if (typeof record[key] === "boolean") {
        result[key] = record[key];
      }
    }
    if (record.startupMode === "tray" || record.startupMode === "window") {
      result.startupMode = record.startupMode;
    }
    if (typeof record.volume === "number" && Number.isFinite(record.volume)) {
      result.volume = Math.min(Math.max(record.volume, 0), 1);
    }
  }
  return result;
}

export function registerSettingsIpc(): void {
  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:update", (_event, patch: unknown) => {
    const updated = updateSettings(sanitize(patch));
    // Keep every window (main + flyout) in sync with the latest settings.
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("settings:changed", updated);
    }
    return updated;
  });
}

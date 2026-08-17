import { ipcMain } from "electron";
import type { AppSettings } from "../../shared/types";
import { getSettings, updateSettings } from "../services/settings";

/** Accepts only known keys with correct types — IPC input is untrusted. */
function sanitize(patch: unknown): Partial<AppSettings> {
  const result: Partial<AppSettings> = {};
  if (typeof patch === "object" && patch !== null) {
    const record = patch as Record<string, unknown>;
    if (typeof record.closeToTray === "boolean") {
      result.closeToTray = record.closeToTray;
    }
  }
  return result;
}

export function registerSettingsIpc(): void {
  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:update", (_event, patch: unknown) =>
    updateSettings(sanitize(patch)),
  );
}

import { app } from "electron";
import { join } from "path";
import type { AppSettings, StartupMode } from "../../shared/types";
import { readJsonFile, writeJsonFileAtomic } from "./store";

/** The JSON-persisted subset. `runOnStartup` lives in the OS login-item
 * registration instead (Task Manager and the registry stay the truth). */
interface PersistedSettings {
  closeToTray: boolean;
  startupMode: StartupMode;
  flyoutCollapseSidebarOnSelect: boolean;
  flyoutCollapseSongListOnPlay: boolean;
  /** Playback volume, 0..1 (PRD §35 "Default volume"). */
  volume: number;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  closeToTray: true,
  startupMode: "tray",
  flyoutCollapseSidebarOnSelect: true,
  flyoutCollapseSongListOnPlay: false,
  volume: 1,
};

function sanitizeVolume(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 1)
    : null;
}

const BOOLEAN_KEYS = [
  "closeToTray",
  "flyoutCollapseSidebarOnSelect",
  "flyoutCollapseSongListOnPlay",
] as const;

/** Present in argv when Windows launched us at sign-in (see loginItemOptions). */
export const STARTUP_ARG = "--startup";

let settings: PersistedSettings = { ...DEFAULT_SETTINGS };

function settingsFile(): string {
  return join(app.getPath("userData"), "settings.json");
}

/** In development the registered executable is electron.exe, which needs the
 * app path as an argument; the packaged exe needs none. The STARTUP_ARG lets
 * the app distinguish sign-in launches from manual ones. */
function loginItemOptions(): { path: string; args: string[] } {
  return {
    path: process.execPath,
    args: app.isPackaged
      ? [STARTUP_ARG]
      : [app.getAppPath(), STARTUP_ARG],
  };
}

function getRunOnStartup(): boolean {
  try {
    return app.getLoginItemSettings(loginItemOptions()).openAtLogin;
  } catch {
    return false;
  }
}

function applyRunOnStartup(enabled: boolean): void {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled, ...loginItemOptions() });
    console.log("[main] run on startup set to:", enabled);
  } catch (error) {
    console.error("[main] failed to update run on startup:", error);
  }
}

/** Reads settings from disk, keeping defaults for anything missing or invalid.
 * A corrupted file must never crash startup (PRD §64). */
export function loadSettings(): void {
  settings = { ...DEFAULT_SETTINGS };
  const parsed = readJsonFile(settingsFile());
  if (typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    for (const key of BOOLEAN_KEYS) {
      if (typeof record[key] === "boolean") {
        settings[key] = record[key];
      }
    }
    if (record.startupMode === "tray" || record.startupMode === "window") {
      settings.startupMode = record.startupMode;
    }
    const volume = sanitizeVolume(record.volume);
    if (volume !== null) settings.volume = volume;
  }
}

export function getSettings(): AppSettings {
  return { ...settings, runOnStartup: getRunOnStartup() };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  if (patch.runOnStartup !== undefined) {
    applyRunOnStartup(patch.runOnStartup);
  }

  const persistedPatch: Partial<PersistedSettings> = {};
  for (const key of BOOLEAN_KEYS) {
    if (typeof patch[key] === "boolean") {
      persistedPatch[key] = patch[key];
    }
  }
  if (patch.startupMode !== undefined) {
    persistedPatch.startupMode = patch.startupMode;
  }
  const volume = sanitizeVolume(patch.volume);
  if (volume !== null) {
    persistedPatch.volume = volume;
  }

  if (Object.keys(persistedPatch).length > 0) {
    settings = { ...settings, ...persistedPatch };
    writeJsonFileAtomic(settingsFile(), settings);
  }

  return getSettings();
}

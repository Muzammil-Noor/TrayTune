import { app } from "electron";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { AppSettings, StartupMode } from "../../shared/types";

/** The JSON-persisted subset. `runOnStartup` lives in the OS login-item
 * registration instead (Task Manager and the registry stay the truth). */
interface PersistedSettings {
  closeToTray: boolean;
  startupMode: StartupMode;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  closeToTray: true,
  startupMode: "tray",
};

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
  try {
    // Strip a UTF-8 BOM — editors and tools may add one, and JSON.parse rejects it.
    const raw = readFileSync(settingsFile(), "utf8").replace(/^\uFEFF/, "");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.closeToTray === "boolean") {
        settings.closeToTray = record.closeToTray;
      }
      if (record.startupMode === "tray" || record.startupMode === "window") {
        settings.startupMode = record.startupMode;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[main] failed to load settings, using defaults:", error);
    }
  }
}

export function getSettings(): AppSettings {
  return { ...settings, runOnStartup: getRunOnStartup() };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  if (patch.runOnStartup !== undefined) {
    applyRunOnStartup(patch.runOnStartup);
  }

  if (patch.closeToTray !== undefined || patch.startupMode !== undefined) {
    settings = {
      ...settings,
      ...(patch.closeToTray !== undefined && { closeToTray: patch.closeToTray }),
      ...(patch.startupMode !== undefined && { startupMode: patch.startupMode }),
    };
    try {
      const file = settingsFile();
      mkdirSync(dirname(file), { recursive: true });
      // Write-then-rename so a crash mid-write cannot corrupt the file.
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(settings, null, 2), "utf8");
      renameSync(tmp, file);
    } catch (error) {
      console.error("[main] failed to persist settings:", error);
    }
  }

  return getSettings();
}

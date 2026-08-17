import { app } from "electron";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { AppSettings } from "../../shared/types";

const DEFAULT_SETTINGS: AppSettings = {
  closeToTray: true,
};

let settings: AppSettings = { ...DEFAULT_SETTINGS };

function settingsFile(): string {
  return join(app.getPath("userData"), "settings.json");
}

/** Reads settings from disk, keeping defaults for anything missing or invalid.
 * A corrupted file must never crash startup (PRD §64). */
export function loadSettings(): void {
  settings = { ...DEFAULT_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(readFileSync(settingsFile(), "utf8"));
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.closeToTray === "boolean") {
        settings.closeToTray = record.closeToTray;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[main] failed to load settings, using defaults:", error);
    }
  }
}

export function getSettings(): AppSettings {
  return settings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  settings = { ...settings, ...patch };
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
  return settings;
}

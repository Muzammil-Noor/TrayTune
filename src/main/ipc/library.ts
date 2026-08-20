import { existsSync } from "fs";
import { extname, isAbsolute } from "path";
import { BrowserWindow, ipcMain } from "electron";
import { SUPPORTED_AUDIO_EXTENSIONS } from "../../shared/constants/audio";
import type { TrackMetadataPatch } from "../../shared/types";
import {
  addTracks,
  addTracksFromPicker,
  getTracks,
  removeTrack,
  updateTrack,
} from "../services/library";

const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 512;
const MAX_PATHS_PER_IMPORT = 500;
const MAX_PATH_LENGTH = 1024;

/** Every window renders from the same library — broadcast after any change. */
function broadcastLibraryChanged(): void {
  const snapshot = getTracks();
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("library:changed", snapshot);
  }
}

function isValidTrackId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH
  );
}

/** Renderer-supplied import paths (drag-and-drop later, tests now) are
 * untrusted: only absolute paths to existing files with a supported audio
 * extension get through (PRD §49 — validate filesystem paths). */
function sanitizePaths(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const paths: string[] = [];
  for (const entry of value.slice(0, MAX_PATHS_PER_IMPORT)) {
    if (
      typeof entry !== "string" ||
      entry.length === 0 ||
      entry.length > MAX_PATH_LENGTH ||
      !isAbsolute(entry)
    ) {
      continue;
    }
    const extension = extname(entry).replace(".", "").toLowerCase();
    if (
      (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(extension) &&
      existsSync(entry)
    ) {
      paths.push(entry);
    }
  }
  return paths;
}

function truncate(value: string): string {
  return value.slice(0, MAX_TEXT_LENGTH);
}

/** Accepts only the editable metadata fields with correct types. */
function sanitizeMetadataPatch(value: unknown): TrackMetadataPatch {
  const patch: TrackMetadataPatch = {};
  if (typeof value !== "object" || value === null) return patch;
  const record = value as Record<string, unknown>;
  for (const key of ["title", "artist", "album", "albumArtist", "genre"] as const) {
    if (typeof record[key] === "string") {
      patch[key] = truncate(record[key]);
    }
  }
  for (const key of ["year", "trackNumber"] as const) {
    if (typeof record[key] === "number" && Number.isFinite(record[key])) {
      patch[key] = record[key];
    }
  }
  // An empty title would make the track unreadable in every list.
  if (patch.title !== undefined && patch.title.trim().length === 0) {
    delete patch.title;
  }
  return patch;
}

export function registerLibraryIpc(): void {
  ipcMain.handle("library:get-tracks", () => getTracks());

  // Without paths: open the picker. With paths: import directly (the path
  // route also serves future drag-and-drop imports).
  ipcMain.handle("library:add-tracks", async (_event, paths: unknown) => {
    const result =
      paths === undefined || paths === null
        ? await addTracksFromPicker()
        : await addTracks(sanitizePaths(paths) ?? []);
    if (result.added.length > 0) broadcastLibraryChanged();
    return result;
  });

  ipcMain.handle("library:remove-track", (_event, trackId: unknown) => {
    if (!isValidTrackId(trackId)) return false;
    const removed = removeTrack(trackId);
    if (removed) broadcastLibraryChanged();
    return removed;
  });

  ipcMain.handle(
    "library:update-track",
    (_event, trackId: unknown, patch: unknown) => {
      if (!isValidTrackId(trackId)) return null;
      const sanitized = sanitizeMetadataPatch(patch);
      if (Object.keys(sanitized).length === 0) return null;
      const updated = updateTrack(trackId, sanitized);
      if (updated) broadcastLibraryChanged();
      return updated;
    },
  );
}

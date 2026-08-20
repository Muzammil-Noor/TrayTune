import { randomUUID } from "crypto";
import { app, dialog } from "electron";
import { basename, extname, join } from "path";
import { parseFile } from "music-metadata";
import { SUPPORTED_AUDIO_EXTENSIONS } from "../../shared/constants/audio";
import type {
  AddTracksResult,
  Track,
  TrackMetadataPatch,
} from "../../shared/types";
import { getMainWindow } from "../windows/registry";
import { readJsonFile, writeJsonFileAtomic } from "./store";

/**
 * The music library: the single source of truth for tracks (PRD §63).
 * Persisted to library.json in the user-data directory; every mutation
 * persists synchronously in call order, so shutdown never has pending writes.
 * Playlists reference tracks by id and live in their own store (Phase 5).
 */

const LIBRARY_VERSION = 1;

let tracks: Track[] = [];
/** Guards against a second picker opening while one is already up. */
let pickerOpen = false;

function libraryFile(): string {
  return join(app.getPath("userData"), "library.json");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/** Accepts only well-formed persisted records — a hand-edited or partially
 * corrupted library must not produce broken tracks at runtime. */
function sanitizeTrack(value: unknown): Track | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    typeof record.title !== "string" ||
    typeof record.filePath !== "string" ||
    record.filePath.length === 0
  ) {
    return null;
  }
  return {
    id: record.id,
    title: record.title,
    artist: optionalString(record.artist),
    album: optionalString(record.album),
    albumArtist: optionalString(record.albumArtist),
    genre: optionalString(record.genre),
    year: optionalNumber(record.year),
    trackNumber: optionalNumber(record.trackNumber),
    duration: optionalNumber(record.duration),
    filePath: record.filePath,
    artworkPath: optionalString(record.artworkPath),
    createdAt: optionalNumber(record.createdAt) ?? Date.now(),
  };
}

export function loadLibrary(): void {
  tracks = [];
  const parsed = readJsonFile(libraryFile());
  if (typeof parsed === "object" && parsed !== null) {
    const list = (parsed as Record<string, unknown>).tracks;
    if (Array.isArray(list)) {
      const seen = new Set<string>();
      for (const entry of list) {
        const track = sanitizeTrack(entry);
        if (track && !seen.has(track.id)) {
          seen.add(track.id);
          tracks.push(track);
        }
      }
    }
  }
  console.log(`[main] library loaded: ${tracks.length} track(s)`);
}

function persistLibrary(): void {
  writeJsonFileAtomic(libraryFile(), { version: LIBRARY_VERSION, tracks });
}

export function getTracks(): Track[] {
  return [...tracks];
}

/** Exact-path duplicate check; Windows paths are case-insensitive. */
function hasFilePath(filePath: string): boolean {
  const needle = filePath.toLowerCase();
  return tracks.some((track) => track.filePath.toLowerCase() === needle);
}

/** Builds a Track for a file. The id is a random UUID minted here and kept
 * for the record's lifetime — stable across renames and never derived from
 * the filename (PRD §10.2). Metadata failures degrade to filename-based
 * fields rather than failing the import. */
async function createTrack(filePath: string): Promise<Track> {
  const fallbackTitle = basename(filePath, extname(filePath));
  const track: Track = {
    id: randomUUID(),
    title: fallbackTitle,
    filePath,
    createdAt: Date.now(),
  };
  try {
    const metadata = await parseFile(filePath, {
      duration: true,
      skipCovers: true, // artwork import is a later phase (PRD §60)
    });
    const common = metadata.common;
    track.title = common.title?.trim() || fallbackTitle;
    track.artist = optionalString(common.artist);
    track.album = optionalString(common.album);
    track.albumArtist = optionalString(common.albumartist);
    track.genre = optionalString(common.genre?.[0]);
    track.year = optionalNumber(common.year);
    track.trackNumber = optionalNumber(common.track.no);
    track.duration =
      metadata.format.duration !== undefined && metadata.format.duration > 0
        ? Math.round(metadata.format.duration)
        : undefined;
  } catch (error) {
    console.warn(
      `[main] could not read metadata of "${basename(filePath)}", using the filename:`,
      error instanceof Error ? error.message : error,
    );
  }
  return track;
}

/** Imports files by path. Duplicates are skipped and single-file failures do
 * not block the rest of the batch (PRD §51). */
export async function addTracks(filePaths: string[]): Promise<AddTracksResult> {
  const added: Track[] = [];
  let duplicateCount = 0;
  let failedCount = 0;

  for (const filePath of filePaths) {
    if (
      hasFilePath(filePath) ||
      added.some(
        (track) => track.filePath.toLowerCase() === filePath.toLowerCase(),
      )
    ) {
      duplicateCount += 1;
      continue;
    }
    try {
      added.push(await createTrack(filePath));
    } catch (error) {
      failedCount += 1;
      console.error(`[main] failed to import "${basename(filePath)}":`, error);
    }
  }

  if (added.length > 0) {
    tracks = [...tracks, ...added];
    persistLibrary();
  }
  console.log(
    `[main] library import: ${added.length} added, ${duplicateCount} duplicate(s), ${failedCount} failed`,
  );
  return { added, duplicateCount, failedCount, canceled: false };
}

/** Shows the file picker and imports the selection (PRD §51). */
export async function addTracksFromPicker(): Promise<AddTracksResult> {
  const nothing: AddTracksResult = {
    added: [],
    duplicateCount: 0,
    failedCount: 0,
    canceled: true,
  };
  if (pickerOpen) return nothing;

  pickerOpen = true;
  try {
    const options: Electron.OpenDialogOptions = {
      title: "Add music",
      filters: [
        { name: "Audio files", extensions: [...SUPPORTED_AUDIO_EXTENSIONS] },
      ],
      properties: ["openFile", "multiSelections"],
    };
    const mainWindow = getMainWindow();
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return nothing;
    return await addTracks(result.filePaths);
  } finally {
    pickerOpen = false;
  }
}

export function removeTrack(trackId: string): boolean {
  const next = tracks.filter((track) => track.id !== trackId);
  if (next.length === tracks.length) return false;
  tracks = next;
  persistLibrary();
  return true;
}

export function updateTrack(
  trackId: string,
  patch: TrackMetadataPatch,
): Track | null {
  const existing = tracks.find((track) => track.id === trackId);
  if (!existing) return null;
  const updated: Track = { ...existing, ...patch };
  tracks = tracks.map((track) => (track.id === trackId ? updated : track));
  persistLibrary();
  return updated;
}

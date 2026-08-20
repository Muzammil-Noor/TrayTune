import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, basename } from "path";

/**
 * Shared JSON persistence for the main-process stores (settings, library,
 * later playlists). Two rules, per PRD §64: writes are atomic (temp file +
 * rename, so a crash mid-write cannot corrupt data) and a corrupted file must
 * never crash startup (it is moved aside for manual recovery and treated as
 * missing).
 */

/** Reads and parses a JSON file. Returns null when the file does not exist or
 * cannot be used. Tolerates a UTF-8 BOM — editors and tools may add one, and
 * JSON.parse rejects it. */
export function readJsonFile(file: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[main] failed to read ${basename(file)}:`, error);
    }
    return null;
  }
  try {
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
  } catch (error) {
    console.error(
      `[main] ${basename(file)} is corrupted — moving it aside and starting fresh:`,
      error,
    );
    try {
      renameSync(file, `${file}.corrupt`);
    } catch {
      // Leaving the corrupt file in place is fine; the next write replaces it.
    }
    return null;
  }
}

/** Atomically serializes `value` to `file`. Failures are logged, never thrown
 * — persistence problems must not take down the app. Returns success. */
export function writeJsonFileAtomic(file: string, value: unknown): boolean {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
    renameSync(tmp, file);
    return true;
  } catch (error) {
    console.error(`[main] failed to persist ${basename(file)}:`, error);
    return false;
  }
}

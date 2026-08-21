import { randomUUID } from "crypto";
import { app } from "electron";
import { join } from "path";
import type { Playlist, PlaylistId, TrackId } from "../../shared/types";
import { hasTrack } from "./library";
import { readJsonFile, writeJsonFileAtomic } from "./store";

/**
 * The playlist store: source of truth for playlists (PRD §63), persisted to
 * playlists.json beside the library. Playlists reference tracks by id and
 * never copy track data (PRD §14). Phase 3 needs create/rename/delete and
 * track membership; reorder and merge arrive with Phase 5.
 */

const PLAYLISTS_VERSION = 1;
export const MAX_PLAYLIST_NAME_LENGTH = 128;

let playlists: Playlist[] = [];

function playlistsFile(): string {
  return join(app.getPath("userData"), "playlists.json");
}

/** Accepts only well-formed persisted records. Track references that no
 * longer resolve to a library track are dropped on load, so a stale or
 * hand-edited file cannot produce ghost entries. */
function sanitizePlaylist(value: unknown): Playlist | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    typeof record.name !== "string" ||
    record.name.trim().length === 0
  ) {
    return null;
  }
  const trackIds: TrackId[] = [];
  if (Array.isArray(record.trackIds)) {
    for (const id of record.trackIds) {
      if (typeof id === "string" && hasTrack(id) && !trackIds.includes(id)) {
        trackIds.push(id);
      }
    }
  }
  const now = Date.now();
  return {
    id: record.id,
    name: record.name.slice(0, MAX_PLAYLIST_NAME_LENGTH),
    trackIds,
    createdAt: typeof record.createdAt === "number" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : now,
  };
}

/** Call after loadLibrary — sanitizing drops references to unknown tracks. */
export function loadPlaylists(): void {
  playlists = [];
  const parsed = readJsonFile(playlistsFile());
  if (typeof parsed === "object" && parsed !== null) {
    const list = (parsed as Record<string, unknown>).playlists;
    if (Array.isArray(list)) {
      const seen = new Set<string>();
      for (const entry of list) {
        const playlist = sanitizePlaylist(entry);
        if (playlist && !seen.has(playlist.id)) {
          seen.add(playlist.id);
          playlists.push(playlist);
        }
      }
    }
  }
  console.log(`[main] playlists loaded: ${playlists.length} playlist(s)`);
}

function persistPlaylists(): void {
  writeJsonFileAtomic(playlistsFile(), {
    version: PLAYLISTS_VERSION,
    playlists,
  });
}

export function getPlaylists(): Playlist[] {
  return playlists.map((playlist) => ({
    ...playlist,
    trackIds: [...playlist.trackIds],
  }));
}

export function createPlaylist(name: string): Playlist | null {
  const trimmed = name.trim().slice(0, MAX_PLAYLIST_NAME_LENGTH);
  if (trimmed.length === 0) return null; // empty names rejected (PRD §52)
  const now = Date.now();
  const playlist: Playlist = {
    id: randomUUID(),
    name: trimmed,
    trackIds: [],
    createdAt: now,
    updatedAt: now,
  };
  playlists = [...playlists, playlist];
  persistPlaylists();
  return playlist;
}

function updatePlaylist(
  playlistId: PlaylistId,
  change: (playlist: Playlist) => Playlist,
): Playlist | null {
  const existing = playlists.find((playlist) => playlist.id === playlistId);
  if (!existing) return null;
  const updated = change(existing);
  if (updated === existing) return existing; // no-op, nothing to persist
  playlists = playlists.map((playlist) =>
    playlist.id === playlistId ? updated : playlist,
  );
  persistPlaylists();
  return updated;
}

export function renamePlaylist(
  playlistId: PlaylistId,
  name: string,
): Playlist | null {
  const trimmed = name.trim().slice(0, MAX_PLAYLIST_NAME_LENGTH);
  if (trimmed.length === 0) return null;
  return updatePlaylist(playlistId, (playlist) => ({
    ...playlist,
    name: trimmed,
    updatedAt: Date.now(),
  }));
}

export function deletePlaylist(playlistId: PlaylistId): boolean {
  const next = playlists.filter((playlist) => playlist.id !== playlistId);
  if (next.length === playlists.length) return false;
  playlists = next;
  persistPlaylists();
  return true;
}

/** Adds a library track to a playlist. Adding one that is already there is a
 * successful no-op — a playlist holds each track at most once. */
export function addTrackToPlaylist(
  playlistId: PlaylistId,
  trackId: TrackId,
): Playlist | null {
  if (!hasTrack(trackId)) return null;
  return updatePlaylist(playlistId, (playlist) =>
    playlist.trackIds.includes(trackId)
      ? playlist
      : {
          ...playlist,
          trackIds: [...playlist.trackIds, trackId],
          updatedAt: Date.now(),
        },
  );
}

/** Removes a track from one playlist. The track stays in the library —
 * these are different operations by design (PRD §53). */
export function removeTrackFromPlaylist(
  playlistId: PlaylistId,
  trackId: TrackId,
): Playlist | null {
  return updatePlaylist(playlistId, (playlist) =>
    playlist.trackIds.includes(trackId)
      ? {
          ...playlist,
          trackIds: playlist.trackIds.filter((id) => id !== trackId),
          updatedAt: Date.now(),
        }
      : playlist,
  );
}

/** Task 5.7 — moves one track within a playlist. Only the playlist's own
 * order changes; a playback queue snapshotted earlier is untouched. */
export function reorderPlaylist(
  playlistId: PlaylistId,
  fromIndex: number,
  toIndex: number,
): Playlist | null {
  return updatePlaylist(playlistId, (playlist) => {
    const count = playlist.trackIds.length;
    if (
      fromIndex < 0 ||
      fromIndex >= count ||
      toIndex < 0 ||
      toIndex >= count ||
      fromIndex === toIndex
    ) {
      return playlist;
    }
    const trackIds = [...playlist.trackIds];
    const [moved] = trackIds.splice(fromIndex, 1);
    trackIds.splice(toIndex, 0, moved);
    return { ...playlist, trackIds, updatedAt: Date.now() };
  });
}

/** Task 5.8 — creates a NEW playlist holding both track lists (first's
 * order, then second's, deduplicated). The originals are never deleted
 * (PRD §54). */
export function mergePlaylists(
  firstId: PlaylistId,
  secondId: PlaylistId,
  name: string,
): Playlist | null {
  if (firstId === secondId) return null;
  const first = playlists.find((playlist) => playlist.id === firstId);
  const second = playlists.find((playlist) => playlist.id === secondId);
  const trimmed = name.trim().slice(0, MAX_PLAYLIST_NAME_LENGTH);
  if (!first || !second || trimmed.length === 0) return null;
  const now = Date.now();
  const merged: Playlist = {
    id: randomUUID(),
    name: trimmed,
    trackIds: [...new Set([...first.trackIds, ...second.trackIds])],
    createdAt: now,
    updatedAt: now,
  };
  playlists = [...playlists, merged];
  persistPlaylists();
  return merged;
}

/** Strips a removed library track from every playlist (PRD §53: removing
 * from the library cleans references). Returns true when anything changed. */
export function removeTrackReferences(trackId: TrackId): boolean {
  let changed = false;
  playlists = playlists.map((playlist) => {
    if (!playlist.trackIds.includes(trackId)) return playlist;
    changed = true;
    return {
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => id !== trackId),
      updatedAt: Date.now(),
    };
  });
  if (changed) persistPlaylists();
  return changed;
}

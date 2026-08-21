import { BrowserWindow, ipcMain } from "electron";
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  MAX_PLAYLIST_NAME_LENGTH,
  removeTrackFromPlaylist,
  renamePlaylist,
} from "../services/playlists";

const MAX_ID_LENGTH = 256;

/** Every window renders the same playlists — broadcast after any change. */
export function broadcastPlaylistsChanged(): void {
  const snapshot = getPlaylists();
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("playlists:changed", snapshot);
  }
}

function isValidId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH
  );
}

/** IPC input is untrusted — a usable name is a non-empty bounded string. */
function sanitizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_PLAYLIST_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

export function registerPlaylistsIpc(): void {
  ipcMain.handle("playlist:get-all", () => getPlaylists());

  ipcMain.handle("playlist:create", (_event, name: unknown) => {
    const valid = sanitizeName(name);
    if (valid === null) return null;
    const playlist = createPlaylist(valid);
    if (playlist) broadcastPlaylistsChanged();
    return playlist;
  });

  ipcMain.handle(
    "playlist:rename",
    (_event, playlistId: unknown, name: unknown) => {
      const valid = sanitizeName(name);
      if (!isValidId(playlistId) || valid === null) return null;
      const playlist = renamePlaylist(playlistId, valid);
      if (playlist) broadcastPlaylistsChanged();
      return playlist;
    },
  );

  ipcMain.handle("playlist:delete", (_event, playlistId: unknown) => {
    if (!isValidId(playlistId)) return false;
    const deleted = deletePlaylist(playlistId);
    if (deleted) broadcastPlaylistsChanged();
    return deleted;
  });

  ipcMain.handle(
    "playlist:add-track",
    (_event, playlistId: unknown, trackId: unknown) => {
      if (!isValidId(playlistId) || !isValidId(trackId)) return null;
      const playlist = addTrackToPlaylist(playlistId, trackId);
      if (playlist) broadcastPlaylistsChanged();
      return playlist;
    },
  );

  ipcMain.handle(
    "playlist:remove-track",
    (_event, playlistId: unknown, trackId: unknown) => {
      if (!isValidId(playlistId) || !isValidId(trackId)) return null;
      const playlist = removeTrackFromPlaylist(playlistId, trackId);
      if (playlist) broadcastPlaylistsChanged();
      return playlist;
    },
  );
}

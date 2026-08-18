import { ipcMain } from "electron";
import type { NowPlayingInfo } from "../../shared/types";
import { updateTrayNowPlaying } from "../tray/tray";

const MAX_LABEL_LENGTH = 128;

/** IPC input is untrusted — accept only the expected shape. */
function sanitize(info: unknown): NowPlayingInfo | null {
  if (typeof info !== "object" || info === null) return null;
  const record = info as Record<string, unknown>;
  if (typeof record.title !== "string" || record.title.length === 0) {
    return null;
  }
  return {
    title: record.title.slice(0, MAX_LABEL_LENGTH),
    artist:
      typeof record.artist === "string"
        ? record.artist.slice(0, MAX_LABEL_LENGTH)
        : undefined,
    isPlaying: record.isPlaying === true,
  };
}

export function registerPlayerIpc(): void {
  ipcMain.on("player:now-playing", (_event, info: unknown) => {
    updateTrayNowPlaying(sanitize(info));
  });
}

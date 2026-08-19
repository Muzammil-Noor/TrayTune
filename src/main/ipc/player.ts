import { ipcMain } from "electron";
import type { PlayerAction, PlayerStateSnapshot } from "../../shared/types";
import {
  dispatchPlayerAction,
  getCachedState,
  publishPlayerState,
} from "../player-bus";
import { updateTrayNowPlaying } from "../tray/tray";

const MAX_LABEL_LENGTH = 128;
const MAX_ID_LENGTH = 256;

/** IPC input is untrusted — accept only known action shapes. */
function sanitizeAction(action: unknown): PlayerAction | null {
  if (typeof action !== "object" || action === null) return null;
  const record = action as Record<string, unknown>;
  switch (record.type) {
    case "play-pause":
    case "previous":
    case "next":
    case "toggle-shuffle":
    case "cycle-repeat":
      return { type: record.type };
    case "seek":
      return typeof record.position === "number" &&
        Number.isFinite(record.position) &&
        record.position >= 0
        ? { type: "seek", position: record.position }
        : null;
    case "play-track":
    case "remove-from-playlist":
    case "remove-from-library":
      return typeof record.trackId === "string" &&
        record.trackId.length <= MAX_ID_LENGTH
        ? { type: record.type, trackId: record.trackId }
        : null;
    case "select-playlist":
      return typeof record.playlistId === "string" &&
        record.playlistId.length <= MAX_ID_LENGTH
        ? { type: "select-playlist", playlistId: record.playlistId }
        : null;
    default:
      return null;
  }
}

export function registerPlayerIpc(): void {
  // Actions from the flyout (tray items call dispatchPlayerAction directly).
  ipcMain.on("player:action", (_event, action: unknown) => {
    const sanitized = sanitizeAction(action);
    if (sanitized) dispatchPlayerAction(sanitized);
  });

  // Race-free state bootstrap for the flyout.
  ipcMain.handle("player:get-state", () => getCachedState());

  // State snapshots from the main window: feed the tray display and relay to
  // the flyout.
  ipcMain.on("player:state-report", (_event, snapshot: unknown) => {
    if (typeof snapshot !== "object" || snapshot === null) return;
    const state = snapshot as PlayerStateSnapshot;
    publishPlayerState(state);

    const track = state.currentTrack;
    updateTrayNowPlaying(
      track && typeof track.title === "string"
        ? {
            title: track.title.slice(0, MAX_LABEL_LENGTH),
            artist:
              typeof track.artist === "string"
                ? track.artist.slice(0, MAX_LABEL_LENGTH)
                : undefined,
            isPlaying: state.isPlaying === true,
          }
        : null,
    );
  });
}

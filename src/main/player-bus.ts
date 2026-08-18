import type { PlayerAction, PlayerStateSnapshot } from "../shared/types";
import { getFlyoutWindow, getMainWindow } from "./windows/registry";

/** Routes player traffic between windows: actions (from tray/flyout) go to the
 * main window, which owns the player state; state snapshots flow back out to
 * the flyout. Phase 4 replaces the main-window owner with a main-process
 * PlaybackManager without changing this shape. */

let lastSnapshot: PlayerStateSnapshot | null = null;

export function dispatchPlayerAction(action: PlayerAction): void {
  getMainWindow()?.webContents.send("player:command", action);
}

export function publishPlayerState(snapshot: PlayerStateSnapshot): void {
  lastSnapshot = snapshot;
  getFlyoutWindow()?.webContents.send("player:state", snapshot);
}

/** Sends the latest known state to the flyout (used right after it loads). */
export function sendCachedStateToFlyout(): void {
  if (lastSnapshot) {
    getFlyoutWindow()?.webContents.send("player:state", lastSnapshot);
  }
}

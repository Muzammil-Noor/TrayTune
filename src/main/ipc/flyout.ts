import { ipcMain } from "electron";
import { showMainWindow } from "../tray/tray";
import {
  handleFlyoutReady,
  hideFlyout,
  setFlyoutCardHeight,
  toggleFlyout,
} from "../windows/flyout-window";

export function registerFlyoutIpc(): void {
  ipcMain.on("flyout:hide", () => {
    hideFlyout();
  });

  // The renderer reports how tall the card is, so the main process knows
  // which part of the (larger, transparent) window is actually interactive.
  ipcMain.on("flyout:set-card-height", (_event, height: unknown) => {
    if (typeof height === "number") setFlyoutCardHeight(height);
  });

  // The renderer confirms it has painted, so the window can be revealed.
  ipcMain.on("flyout:ready", () => {
    handleFlyoutReady();
  });

  // Programmatic equivalent of the tray click (also used by tests; a future
  // global shortcut would call this too).
  ipcMain.on("flyout:toggle", () => {
    toggleFlyout();
  });

  ipcMain.on("flyout:open-main-window", () => {
    hideFlyout();
    showMainWindow();
  });
}

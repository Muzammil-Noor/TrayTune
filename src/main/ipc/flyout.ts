import { ipcMain } from "electron";
import { showMainWindow } from "../tray/tray";
import {
  hideFlyout,
  setFlyoutExpanded,
  toggleFlyout,
} from "../windows/flyout-window";

export function registerFlyoutIpc(): void {
  ipcMain.on("flyout:hide", () => {
    hideFlyout();
  });

  // Renderer reports song-list expansion so the window can resize to match.
  ipcMain.on("flyout:set-expanded", (_event, value: unknown) => {
    setFlyoutExpanded(value === true);
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

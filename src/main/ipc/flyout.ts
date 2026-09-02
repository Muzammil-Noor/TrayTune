import { ipcMain } from "electron";
import { showMainWindow } from "../tray/tray";
import { hideFlyout, toggleFlyout } from "../windows/flyout-window";

export function registerFlyoutIpc(): void {
  ipcMain.on("flyout:hide", () => {
    hideFlyout();
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

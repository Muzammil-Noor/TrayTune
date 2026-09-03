import { ipcMain } from "electron";
import { showMainWindow } from "../tray/tray";
import {
  hideFlyout,
  setFlyoutPanelHeight,
  toggleFlyout,
} from "../windows/flyout-window";

export function registerFlyoutIpc(): void {
  ipcMain.on("flyout:hide", () => {
    hideFlyout();
  });

  // The renderer sizes the window to its visible card (see flyout-window.ts).
  ipcMain.on("flyout:set-panel-height", (_event, height: unknown) => {
    if (typeof height === "number") setFlyoutPanelHeight(height);
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

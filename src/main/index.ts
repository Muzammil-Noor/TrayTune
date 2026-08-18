import { app, BrowserWindow } from "electron";
import { registerFlyoutIpc } from "./ipc/flyout";
import { registerPlayerIpc } from "./ipc/player";
import { registerSettingsIpc } from "./ipc/settings";
import { registerSystemIpc } from "./ipc/system";
import { markQuitting } from "./lifecycle";
import { loadSettings } from "./services/settings";
import { createTray, destroyTray } from "./tray/tray";
import { createMainWindow } from "./windows/main-window";

// A tray app must never run twice; a second launch focuses the existing window.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  console.log("[main] another instance holds the lock — quitting");
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("com.traytune.app");
    loadSettings();
    registerSystemIpc();
    registerSettingsIpc();
    registerPlayerIpc();
    registerFlyoutIpc();
    createMainWindow();
    createTray();
  });

  // Ordered shutdown (PRD §66): stop playback → finish persistence → destroy
  // tray → close windows → quit. Playback stop hooks in here in Phase 4 (the
  // window teardown ends mock/renderer audio); settings writes are synchronous,
  // so nothing is pending by this point.
  app.on("before-quit", () => {
    console.log("[main] shutting down");
    markQuitting();
    destroyTray();
  });

  app.on("will-quit", () => {
    console.log("[main] shutdown complete");
  });

  // Fires only when the window really closes (closeToTray off or app quit).
  app.on("window-all-closed", () => {
    console.log("[main] window-all-closed — quitting");
    app.quit();
  });
}

import { app, BrowserWindow } from "electron";
import { registerSystemIpc } from "./ipc/system";
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
    registerSystemIpc();
    createMainWindow();
  });

  // Phase 2 will keep the app alive in the tray instead.
  app.on("window-all-closed", () => {
    console.log("[main] window-all-closed — quitting");
    app.quit();
  });
}

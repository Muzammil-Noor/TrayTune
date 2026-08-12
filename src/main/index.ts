import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./windows/main-window";

// A tray app must never run twice; a second launch focuses the existing window.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
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
    createMainWindow();
  });

  // Phase 2 will keep the app alive in the tray instead.
  app.on("window-all-closed", () => {
    app.quit();
  });
}

import { BrowserWindow, nativeTheme, shell } from "electron";
import { join } from "path";

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: "TrayTune",
    width: 1000,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    // Matches the renderer theme tokens so there is no flash on startup.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#202020" : "#f3f3f3",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.on("ready-to-show", () => {
    window.show();
  });

  window.on("closed", () => {
    console.log("[main] main window closed");
  });

  window.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error("[main] renderer failed to load:", code, description, url);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    console.error("[main] renderer process gone:", details.reason);
  });

  // Any window.open / target=_blank goes to the default browser, never in-app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

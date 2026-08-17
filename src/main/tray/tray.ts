import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import type { PlayerCommand } from "../../shared/types";
import trayIconPath from "../../../resources/tray-icon.png?asset";

let tray: Tray | null = null;

function sendPlayerCommand(window: BrowserWindow, command: PlayerCommand): void {
  if (!window.isDestroyed()) {
    window.webContents.send("player:command", command);
  }
}

function showWindow(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function createTray(window: BrowserWindow): Tray {
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);
  tray.setToolTip("TrayTune");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open TrayTune", click: () => showWindow(window) },
      { type: "separator" },
      {
        label: "Play/Pause",
        click: () => sendPlayerCommand(window, "play-pause"),
      },
      { label: "Previous", click: () => sendPlayerCommand(window, "previous") },
      { label: "Next", click: () => sendPlayerCommand(window, "next") },
      { type: "separator" },
      { label: "Exit", click: () => app.quit() },
    ]),
  );

  // Single click toggles the window, like most Windows tray players.
  tray.on("click", () => {
    if (window.isDestroyed()) return;
    if (window.isVisible() && window.isFocused()) {
      window.hide();
    } else {
      showWindow(window);
    }
  });

  console.log("[main] tray created");
  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}

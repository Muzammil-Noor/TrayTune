import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import type { NowPlayingInfo, PlayerCommand } from "../../shared/types";
import trayIconPath from "../../../resources/tray-icon.png?asset";

let tray: Tray | null = null;
let trayWindow: BrowserWindow | null = null;
let nowPlaying: NowPlayingInfo | null = null;

function sendPlayerCommand(command: PlayerCommand): void {
  if (trayWindow && !trayWindow.isDestroyed()) {
    trayWindow.webContents.send("player:command", command);
  }
}

function showWindow(): void {
  if (!trayWindow || trayWindow.isDestroyed()) return;
  if (trayWindow.isMinimized()) trayWindow.restore();
  trayWindow.show();
  trayWindow.focus();
}

function shorten(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Menu layout follows PRD §7: now playing, controls, Open, Exit. */
function rebuildMenu(): void {
  if (!tray) return;

  const nowPlayingItems = nowPlaying
    ? [
        {
          label: `${nowPlaying.isPlaying ? "▶" : "⏸"}  ${shorten(nowPlaying.title)}${
            nowPlaying.artist ? ` — ${shorten(nowPlaying.artist, 24)}` : ""
          }`,
          enabled: false,
        },
        { type: "separator" as const },
      ]
    : [];

  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...nowPlayingItems,
      {
        label: nowPlaying?.isPlaying ? "Pause" : "Play",
        click: () => sendPlayerCommand("play-pause"),
      },
      { label: "Previous", click: () => sendPlayerCommand("previous") },
      { label: "Next", click: () => sendPlayerCommand("next") },
      { type: "separator" },
      { label: "Open TrayTune", click: () => showWindow() },
      { label: "Exit", click: () => app.quit() },
    ]),
  );

  tray.setToolTip(
    nowPlaying ? `TrayTune — ${shorten(nowPlaying.title)}` : "TrayTune",
  );
}

export function createTray(window: BrowserWindow): Tray {
  trayWindow = window;
  tray = new Tray(nativeImage.createFromPath(trayIconPath));
  rebuildMenu();

  // Single click toggles the window, like most Windows tray players.
  tray.on("click", () => {
    if (!trayWindow || trayWindow.isDestroyed()) return;
    if (trayWindow.isVisible() && trayWindow.isFocused()) {
      trayWindow.hide();
    } else {
      showWindow();
    }
  });

  console.log("[main] tray created");
  return tray;
}

export function updateTrayNowPlaying(info: NowPlayingInfo | null): void {
  nowPlaying = info;
  rebuildMenu();
  console.log(
    "[main] tray now playing:",
    info ? `${info.isPlaying ? "playing" : "paused"} — ${info.title}` : "none",
  );
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
  trayWindow = null;
}

import { app, Menu, nativeImage, Tray } from "electron";
import { dispatchPlayerAction } from "../player-bus";
import { toggleFlyout } from "../windows/flyout-window";
import { getMainWindow } from "../windows/registry";
import trayIconPath from "../../../resources/tray-icon.png?asset";

interface TrayNowPlaying {
  title: string;
  artist?: string;
  isPlaying: boolean;
}

let tray: Tray | null = null;
let nowPlaying: TrayNowPlaying | null = null;

export function showMainWindow(): void {
  const window = getMainWindow();
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
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
        click: () => dispatchPlayerAction({ type: "play-pause" }),
      },
      {
        label: "Previous",
        click: () => dispatchPlayerAction({ type: "previous" }),
      },
      { label: "Next", click: () => dispatchPlayerAction({ type: "next" }) },
      { type: "separator" },
      { label: "Open TrayTune", click: () => showMainWindow() },
      { label: "Exit", click: () => app.quit() },
    ]),
  );

  tray.setToolTip(
    nowPlaying ? `TrayTune — ${shorten(nowPlaying.title)}` : "TrayTune",
  );
}

export function createTray(): Tray {
  tray = new Tray(nativeImage.createFromPath(trayIconPath));
  rebuildMenu();

  // Left click opens the flyout mini player above the tray (Twinkle Tray
  // style); right click keeps the context menu.
  tray.on("click", () => {
    toggleFlyout();
  });

  console.log("[main] tray created");
  return tray;
}

export function updateTrayNowPlaying(info: TrayNowPlaying | null): void {
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
}

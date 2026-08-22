import { execFile } from "child_process";
import { app, Menu, nativeImage, nativeTheme, Tray } from "electron";
import { dispatchPlayerAction } from "../player-bus";
import { toggleFlyout } from "../windows/flyout-window";
import { getMainWindow } from "../windows/registry";
import trayIconDark from "../../../resources/tray-dark.ico?asset";
import trayIconLight from "../../../resources/tray-light.ico?asset";

interface TrayNowPlaying {
  title: string;
  artist?: string;
  isPlaying: boolean;
}

let tray: Tray | null = null;
let nowPlaying: TrayNowPlaying | null = null;

/**
 * Tray icon theming. The icon is a monochrome Segoe Fluent Icons glyph in two
 * inks (see scripts/generate-icons.cjs), and the right one depends on the
 * *taskbar* colour — which Windows themes separately from apps ("Windows
 * mode" vs "app mode"). Electron only exposes the app mode, so the taskbar
 * mode is read from the registry, with the app mode as the fallback.
 */
const PERSONALIZE_KEY =
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";

/** Explorer broadcasts this (with "ImmersiveColorSet") when the theme
 * changes. nativeTheme's "updated" event is NOT enough: it only tracks the
 * app mode, so switching just the Windows/taskbar mode never reaches it. */
const WM_SETTINGCHANGE = 0x001a;

/** Best guess until the registry answers; corrected within milliseconds. */
let lightTaskbar = !nativeTheme.shouldUseDarkColors;
let refreshTimer: NodeJS.Timeout | null = null;

function readTaskbarUsesLightTheme(): Promise<boolean | null> {
  return new Promise((resolve) => {
    execFile(
      "reg",
      ["query", PERSONALIZE_KEY, "/v", "SystemUsesLightTheme"],
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const match = /SystemUsesLightTheme\s+REG_DWORD\s+0x([0-9a-fA-F]+)/.exec(
          stdout,
        );
        resolve(match ? Number.parseInt(match[1], 16) === 1 : null);
      },
    );
  });
}

function applyTrayIcon(): void {
  tray?.setImage(
    nativeImage.createFromPath(lightTaskbar ? trayIconLight : trayIconDark),
  );
}

/** Re-reads the taskbar theme and recolours the icon when it changed. */
async function refreshTrayIconTheme(): Promise<void> {
  const light = await readTaskbarUsesLightTheme();
  const next = light ?? !nativeTheme.shouldUseDarkColors;
  if (next === lightTaskbar || !tray) return;
  lightTaskbar = next;
  applyTrayIcon();
  console.log(`[main] tray icon switched to ${next ? "light" : "dark"} taskbar`);
}

/** Theme changes arrive as a burst of messages; settle before reading. */
function scheduleTrayIconThemeRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshTrayIconTheme();
  }, 150);
}

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
  tray = new Tray(
    nativeImage.createFromPath(lightTaskbar ? trayIconLight : trayIconDark),
  );
  rebuildMenu();

  // Left click opens the flyout mini player above the tray (Twinkle Tray
  // style); right click keeps the context menu.
  tray.on("click", () => {
    // Cheap self-heal: if the taskbar theme changed without Chromium
    // noticing, the icon is corrected the next time the user opens the flyout.
    void refreshTrayIconTheme();
    toggleFlyout();
  });

  // The main window is the app's message sink for broadcast theme changes; it
  // is created before the tray and only ever hidden, never closed, while the
  // app runs. nativeTheme covers app-mode changes on top of that.
  getMainWindow()?.hookWindowMessage(WM_SETTINGCHANGE, () => {
    scheduleTrayIconThemeRefresh();
  });
  nativeTheme.on("updated", scheduleTrayIconThemeRefresh);
  void refreshTrayIconTheme();

  console.log("[main] tray created");
  return tray;
}

export function updateTrayNowPlaying(info: TrayNowPlaying | null): void {
  // State reports now arrive several times a second (live playback position);
  // only rebuild the menu when something the tray shows actually changed.
  if (
    info?.title === nowPlaying?.title &&
    info?.artist === nowPlaying?.artist &&
    info?.isPlaying === nowPlaying?.isPlaying
  ) {
    return;
  }
  nowPlaying = info;
  rebuildMenu();
  console.log(
    "[main] tray now playing:",
    info ? `${info.isPlaying ? "playing" : "paused"} — ${info.title}` : "none",
  );
}

export function destroyTray(): void {
  nativeTheme.removeListener("updated", scheduleTrayIconThemeRefresh);
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  tray?.destroy();
  tray = null;
}

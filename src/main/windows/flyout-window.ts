import { BrowserWindow, nativeTheme, screen } from "electron";
import { join } from "path";
import { isQuitting } from "../lifecycle";
import { sendCachedStateToFlyout } from "../player-bus";
import { getFlyoutWindow, setFlyoutWindow } from "./registry";

const FLYOUT_WIDTH = 380;
const COMPACT_HEIGHT = 190; // header + player only (song list collapsed)
const EXPANDED_HEIGHT = 520;
const MARGIN = 12;

/** The renderer starts with the song list collapsed; it reports expansion
 * changes via flyout:set-expanded so the window can resize to match. */
let expanded = false;

function currentHeight(): number {
  return expanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT;
}

/** Tray-icon clicks arrive right after the flyout's own blur has hidden it;
 * within this window we treat the click as "toggle closed", not "reopen". */
let lastBlurAt = 0;
const BLUR_TOGGLE_GRACE_MS = 300;

function createFlyoutWindow(): BrowserWindow {
  expanded = false; // fresh windows always mount with the list collapsed
  const flyout = new BrowserWindow({
    width: FLYOUT_WIDTH,
    height: COMPACT_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    roundedCorners: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#202020" : "#f3f3f3",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  flyout.on("blur", () => {
    lastBlurAt = Date.now();
    flyout.hide();
  });

  // Alt+F4 etc. hide the flyout rather than destroying it.
  flyout.on("close", (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      flyout.hide();
    }
  });

  flyout.on("closed", () => {
    setFlyoutWindow(null);
  });

  flyout.webContents.on("did-finish-load", () => {
    sendCachedStateToFlyout();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    flyout.loadURL(`${process.env.ELECTRON_RENDERER_URL}#flyout`);
  } else {
    flyout.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "flyout",
    });
  }

  setFlyoutWindow(flyout);
  console.log("[main] flyout window created");
  return flyout;
}

/** Anchors the flyout to the bottom-right of the work area at its current
 * size, so expanding grows it upward from the tray corner. */
function positionFlyout(flyout: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay();
  const height = currentHeight();
  flyout.setBounds({
    x: workArea.x + workArea.width - FLYOUT_WIDTH - MARGIN,
    y: workArea.y + workArea.height - height - MARGIN,
    width: FLYOUT_WIDTH,
    height,
  });
}

/** Windows has no native animated setBounds, so tween it: ~60fps eased
 * resize, bottom edge pinned to the tray corner. Keep RESIZE_MS in sync with
 * the renderer's list-unmount delay in FlyoutApp. */
const RESIZE_MS = 300;
let resizeTimer: NodeJS.Timeout | null = null;

function cancelResizeAnimation(): void {
  if (resizeTimer) {
    clearInterval(resizeTimer);
    resizeTimer = null;
  }
}

function animateToCurrentHeight(flyout: BrowserWindow): void {
  cancelResizeAnimation();
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x + workArea.width - FLYOUT_WIDTH - MARGIN;
  const bottom = workArea.y + workArea.height - MARGIN;
  const target = currentHeight();
  const startHeight = flyout.getBounds().height;
  const delta = target - startHeight;
  if (delta === 0) return;

  const startedAt = Date.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  resizeTimer = setInterval(() => {
    if (flyout.isDestroyed()) {
      cancelResizeAnimation();
      return;
    }
    const t = Math.min(1, (Date.now() - startedAt) / RESIZE_MS);
    const height = Math.round(startHeight + delta * easeOutCubic(t));
    flyout.setBounds({ x, y: bottom - height, width: FLYOUT_WIDTH, height });
    if (t >= 1) cancelResizeAnimation();
  }, 16);
}

export function setFlyoutExpanded(value: boolean): void {
  expanded = value;
  const flyout = getFlyoutWindow();
  if (!flyout) return;
  if (flyout.isVisible()) {
    animateToCurrentHeight(flyout);
  } else {
    positionFlyout(flyout);
  }
}

/** Tray left-click behavior: open above the tray, or close if it was open. */
export function toggleFlyout(): void {
  const existing = getFlyoutWindow();

  if (existing?.isVisible()) {
    existing.hide();
    return;
  }
  // The click that "closed" the flyout already did so via blur — don't reopen.
  if (Date.now() - lastBlurAt < BLUR_TOGGLE_GRACE_MS) {
    return;
  }

  const flyout = existing ?? createFlyoutWindow();
  positionFlyout(flyout);
  flyout.show();
  flyout.focus();
  sendCachedStateToFlyout();
}

export function hideFlyout(): void {
  cancelResizeAnimation();
  getFlyoutWindow()?.hide();
}

export function destroyFlyout(): void {
  cancelResizeAnimation();
  const flyout = getFlyoutWindow();
  if (flyout) {
    flyout.destroy(); // bypasses the close handler's hide-instead-of-close
    setFlyoutWindow(null);
  }
}

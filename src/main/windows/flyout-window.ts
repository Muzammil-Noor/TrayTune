import { BrowserWindow, screen } from "electron";
import { join } from "path";
import {
  FLYOUT_WINDOW_HEIGHT,
  FLYOUT_WINDOW_WIDTH,
} from "../../shared/constants/flyout";
import { isQuitting } from "../lifecycle";
import { sendCachedStateToFlyout } from "../player-bus";
import { getFlyoutWindow, setFlyoutWindow } from "./registry";

/**
 * Mini player above the tray. The window is transparent and always sized for
 * the fully expanded panel; the renderer draws an opaque card against its
 * bottom edge and animates the song list open and shut in CSS.
 *
 * It used to be an opaque window whose height was tweened from here, but a
 * main-process resize loop cannot stay in step with the renderer's paint: on
 * every mismatched frame the bottom-anchored player was drawn against the
 * wrong window height, which read as jitter. A window that never moves has no
 * such failure mode.
 */

/** Tray-icon clicks arrive right after the flyout's own blur has hidden it;
 * within this window we treat the click as "toggle closed", not "reopen". */
let lastBlurAt = 0;
const BLUR_TOGGLE_GRACE_MS = 300;

function createFlyoutWindow(): BrowserWindow {
  const flyout = new BrowserWindow({
    width: FLYOUT_WINDOW_WIDTH,
    height: FLYOUT_WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // The card supplies its own rounded corners and shadow; the rest of the
    // window is see-through padding around it.
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    roundedCorners: false,
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

/** Anchors the flyout to the bottom-right of the work area. The window's
 * transparent padding provides the visual gap from the screen edges. */
function positionFlyout(flyout: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay();
  flyout.setBounds({
    x: workArea.x + workArea.width - FLYOUT_WINDOW_WIDTH,
    y: workArea.y + workArea.height - FLYOUT_WINDOW_HEIGHT,
    width: FLYOUT_WINDOW_WIDTH,
    height: FLYOUT_WINDOW_HEIGHT,
  });
}

/** Showing a transparent window on Windows presents one fully-opaque frame
 * before the shell's own show animation begins, which reads as a blink:
 * appear, vanish, fade back in. Raising the window at zero opacity and
 * restoring it once it is up drops that stray frame. */
function showFlyout(flyout: BrowserWindow): void {
  flyout.setOpacity(0);
  positionFlyout(flyout);
  flyout.show();
  flyout.focus();
  setTimeout(() => {
    if (!flyout.isDestroyed()) flyout.setOpacity(1);
  }, 0);
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
  showFlyout(flyout);
  sendCachedStateToFlyout();
}

export function hideFlyout(): void {
  getFlyoutWindow()?.hide();
}

export function destroyFlyout(): void {
  const flyout = getFlyoutWindow();
  if (flyout) {
    flyout.destroy(); // bypasses the close handler's hide-instead-of-close
    setFlyoutWindow(null);
  }
}

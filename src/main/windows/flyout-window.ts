import { BrowserWindow, screen } from "electron";
import { join } from "path";
import {
  FLYOUT_CHROME_HEIGHT,
  FLYOUT_HIT_TEST_MS,
  FLYOUT_PADDING,
  FLYOUT_REVEAL_TIMEOUT_MS,
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

/** Set while a show is waiting for the renderer to confirm it has painted. */
let pendingReveal: (() => void) | null = null;
let revealTimer: NodeJS.Timeout | null = null;

/** Height of the visible card, reported by the renderer. Only used to work
 * out where the card is for hit-testing — the window itself never resizes. */
let cardHeight = FLYOUT_CHROME_HEIGHT;
let hitTestTimer: NodeJS.Timeout | null = null;
let interactive = true;

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
    stopHitTesting();
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

export function setFlyoutCardHeight(height: number): void {
  if (!Number.isFinite(height)) return;
  cardHeight = Math.min(Math.max(Math.round(height), 0), FLYOUT_WINDOW_HEIGHT);
}

/** The window covers far more of the screen than the card does, and the rest
 * is see-through. Clicks there should reach whatever is showing through
 * rather than being swallowed, so the window is made click-through whenever
 * the pointer is outside the card.
 *
 * The pointer is polled from here rather than tracked in the renderer:
 * `setIgnoreMouseEvents(true, { forward: true })` stops delivering mouse
 * moves once the window is click-through, so the renderer could never tell
 * when the pointer came back — which left the card itself unclickable. */
function updateInteractivity(flyout: BrowserWindow): void {
  const bounds = flyout.getBounds();
  const pointer = screen.getCursorScreenPoint();
  // The card plus its padding, so interactivity switches on a moment before
  // the pointer is actually over a control.
  const top = bounds.y + bounds.height - cardHeight - FLYOUT_PADDING * 2;
  const overCard =
    pointer.x >= bounds.x &&
    pointer.x < bounds.x + bounds.width &&
    pointer.y >= top &&
    pointer.y < bounds.y + bounds.height;
  if (overCard === interactive) return;
  interactive = overCard;
  flyout.setIgnoreMouseEvents(!overCard);
}

function startHitTesting(flyout: BrowserWindow): void {
  stopHitTesting();
  updateInteractivity(flyout);
  hitTestTimer = setInterval(() => {
    if (flyout.isDestroyed() || !flyout.isVisible()) {
      stopHitTesting();
      return;
    }
    updateInteractivity(flyout);
  }, FLYOUT_HIT_TEST_MS);
}

function stopHitTesting(): void {
  if (hitTestTimer) clearInterval(hitTestTimer);
  hitTestTimer = null;
}

/** Called when the renderer reports it has painted a frame for this show. */
export function handleFlyoutReady(): void {
  pendingReveal?.();
}

/** Showing a transparent window on Windows presents one fully-opaque frame
 * before the shell's own show animation begins, which reads as a blink:
 * appear, vanish, fade back in. The window is therefore raised at zero
 * opacity and only revealed once the renderer confirms it has painted a frame
 * at this position — a fixed delay raced the paint and let the blink through
 * intermittently. The timer is a safety net if that confirmation never comes. */
function showFlyout(flyout: BrowserWindow): void {
  cancelPendingReveal();
  flyout.setOpacity(0);
  positionFlyout(flyout);
  interactive = true;
  flyout.setIgnoreMouseEvents(false);
  flyout.show();
  flyout.focus();
  startHitTesting(flyout);

  const reveal = () => {
    cancelPendingReveal();
    if (!flyout.isDestroyed()) flyout.setOpacity(1);
  };
  pendingReveal = reveal;
  revealTimer = setTimeout(() => {
    console.warn("[main] flyout revealed without the renderer's paint signal");
    reveal();
  }, FLYOUT_REVEAL_TIMEOUT_MS);
  flyout.webContents.send("flyout:shown");
}

function cancelPendingReveal(): void {
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = null;
  pendingReveal = null;
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
  cancelPendingReveal();
  stopHitTesting();
  getFlyoutWindow()?.hide();
}

export function destroyFlyout(): void {
  cancelPendingReveal();
  stopHitTesting();
  const flyout = getFlyoutWindow();
  if (flyout) {
    flyout.destroy(); // bypasses the close handler's hide-instead-of-close
    setFlyoutWindow(null);
  }
}

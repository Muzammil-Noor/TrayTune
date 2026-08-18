import type { BrowserWindow } from "electron";

/** Central window references so tray/IPC/flyout modules don't import each
 * other in cycles. */

let mainWindow: BrowserWindow | null = null;
let flyoutWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

export function setFlyoutWindow(window: BrowserWindow | null): void {
  flyoutWindow = window;
}

export function getFlyoutWindow(): BrowserWindow | null {
  return flyoutWindow && !flyoutWindow.isDestroyed() ? flyoutWindow : null;
}

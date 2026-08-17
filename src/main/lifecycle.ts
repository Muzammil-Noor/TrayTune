/** Tracks whether the app is really quitting, so the window's close handler
 * can tell "close to tray" apart from "exit the application". */
let quitting = false;

export function markQuitting(): void {
  quitting = true;
}

export function isQuitting(): boolean {
  return quitting;
}

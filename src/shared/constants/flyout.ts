/**
 * Flyout geometry, shared by the main process (window bounds) and the
 * renderer (the animated panel).
 *
 * The window is a fixed-size transparent shell; the renderer paints an opaque
 * card at its bottom edge and animates the song list's height in CSS. The
 * window itself is never resized while animating — doing that per frame
 * cannot stay in sync with the renderer's paint, which made the
 * bottom-anchored player jump around during the transition.
 */

export const FLYOUT_WIDTH = 380;

/** Height the song list animates between (0 when collapsed). */
export const FLYOUT_LIST_HEIGHT = 330;

/** Room reserved for the card's header and player, plus a little slack. */
export const FLYOUT_CHROME_HEIGHT = 200;

/** Transparent breathing room inside the window for the card's shadow. */
export const FLYOUT_PADDING = 12;

export const FLYOUT_WINDOW_WIDTH = FLYOUT_WIDTH + FLYOUT_PADDING * 2;
export const FLYOUT_WINDOW_HEIGHT =
  FLYOUT_LIST_HEIGHT + FLYOUT_CHROME_HEIGHT + FLYOUT_PADDING * 2;

/** Keep in sync with the CSS transition duration on the list. */
export const FLYOUT_ANIMATION_MS = 300;

/**
 * Flyout geometry, shared by the main process (window bounds) and the
 * renderer (the animated panel).
 *
 * The window is transparent, always sized for the fully expanded panel, and
 * NEVER resized while it is on screen. Resizing a visible window cannot be
 * synchronised with the renderer's paint: Windows keeps compositing the last
 * painted frame at the window's new top-left until a fresh one arrives, so
 * the bottom-anchored player visibly jumps. The area above the card is made
 * click-through instead (see setFlyoutInteractive), so an oversized window
 * costs nothing.
 */

export const FLYOUT_WIDTH = 380;

/** Height the song list animates between (0 when collapsed). */
export const FLYOUT_LIST_HEIGHT = 330;

/** Room for the card's header and player, plus a little slack. */
export const FLYOUT_CHROME_HEIGHT = 200;

/** Transparent breathing room around the card, for its drop shadow. */
export const FLYOUT_PADDING = 12;

export const FLYOUT_WINDOW_WIDTH = FLYOUT_WIDTH + FLYOUT_PADDING * 2;
export const FLYOUT_WINDOW_HEIGHT =
  FLYOUT_LIST_HEIGHT + FLYOUT_CHROME_HEIGHT + FLYOUT_PADDING * 2;

/** Keep in sync with the CSS transition duration on the list. */
export const FLYOUT_ANIMATION_MS = 300;

/** How often the main process checks whether the pointer is over the card,
 * to decide if the transparent area should pass clicks through. */
export const FLYOUT_HIT_TEST_MS = 40;

/** How long to wait for the renderer to confirm it has painted before
 * revealing the window anyway. */
export const FLYOUT_REVEAL_TIMEOUT_MS = 250;

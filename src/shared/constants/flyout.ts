/**
 * Flyout geometry, shared by the main process (window bounds) and the
 * renderer (the animated panel).
 *
 * The window is transparent and sized to the visible card plus a little
 * padding for its shadow, so at rest it swallows almost no clicks. It is only
 * grown to fit the expanded panel for the duration of the open/close
 * animation — never resized *during* it, because a main-process resize loop
 * cannot stay in sync with the renderer's paint, which made the
 * bottom-anchored player jump around.
 */

export const FLYOUT_WIDTH = 380;

/** Height the song list animates between (0 when collapsed). */
export const FLYOUT_LIST_HEIGHT = 330;

/** Transparent breathing room around the card, for its drop shadow. */
export const FLYOUT_PADDING = 12;

export const FLYOUT_WINDOW_WIDTH = FLYOUT_WIDTH + FLYOUT_PADDING * 2;

/** Keep in sync with the CSS transition duration on the list. */
export const FLYOUT_ANIMATION_MS = 300;

/** Used until the renderer reports the card's measured height. */
export const FLYOUT_INITIAL_PANEL_HEIGHT = 200;

/** Clamps for renderer-reported panel heights — IPC input is untrusted. */
export const FLYOUT_MIN_PANEL_HEIGHT = 100;
export const FLYOUT_MAX_PANEL_HEIGHT = 800;

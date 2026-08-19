import type {
  AppSettings,
  PlayerAction,
  PlayerStateSnapshot,
} from "../shared/types";

export interface TrayTuneApi {
  readonly platform: string;
  readonly system: {
    /** Windows accent color as #rrggbb, or null when unavailable. */
    getAccentColor(): Promise<string | null>;
    /** Subscribes to live accent changes; returns an unsubscribe function. */
    onAccentColorChanged(callback: (color: string) => void): () => void;
  };
  readonly settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  readonly player: {
    /** Main window: actions from the tray menu / flyout. Returns unsubscribe. */
    onAction(callback: (action: PlayerAction) => void): () => void;
    /** Flyout: send an action for the main window's player to apply. */
    sendAction(action: PlayerAction): void;
    /** Main window: report the full player state after every change. */
    reportState(snapshot: PlayerStateSnapshot): void;
    /** Flyout: receive player state snapshots. Returns unsubscribe. */
    onState(callback: (snapshot: PlayerStateSnapshot) => void): () => void;
    /** Flyout: pull the latest snapshot on mount (push alone can race). */
    getState(): Promise<PlayerStateSnapshot | null>;
  };
  readonly flyout: {
    hide(): void;
    toggle(): void;
    openMainWindow(): void;
    /** Report song-list expansion so the window resizes to match. */
    setExpanded(value: boolean): void;
  };
}

declare global {
  interface Window {
    traytune: TrayTuneApi;
  }
}

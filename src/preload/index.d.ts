import type { AppSettings, PlayerCommand } from "../shared/types";

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
    /** Playback commands from the main process (tray menu, media keys later).
     * Returns an unsubscribe function. */
    onCommand(callback: (command: PlayerCommand) => void): () => void;
  };
}

declare global {
  interface Window {
    traytune: TrayTuneApi;
  }
}

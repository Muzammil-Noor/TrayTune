export interface TrayTuneApi {
  readonly platform: string;
  readonly system: {
    /** Windows accent color as #rrggbb, or null when unavailable. */
    getAccentColor(): Promise<string | null>;
    /** Subscribes to live accent changes; returns an unsubscribe function. */
    onAccentColorChanged(callback: (color: string) => void): () => void;
  };
}

declare global {
  interface Window {
    traytune: TrayTuneApi;
  }
}

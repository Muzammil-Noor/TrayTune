export interface TrayTuneApi {
  readonly platform: string;
}

declare global {
  interface Window {
    traytune: TrayTuneApi;
  }
}

import { useEffect, useState } from "react";
import type { AppSettings } from "@shared/types";

/** Loads and updates app settings through the preload API. `settings` is null
 * while loading (or if the bridge is unavailable). */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    window.traytune?.settings
      .get()
      .then(setSettings)
      .catch(() => setSettings(null));
    // Stay in sync when another window (main vs flyout) changes settings.
    return window.traytune?.settings.onChanged(setSettings);
  }, []);

  function update(patch: Partial<AppSettings>) {
    window.traytune?.settings
      .update(patch)
      .then(setSettings)
      .catch(() => {
        /* keep the current value; the main process logs the failure */
      });
  }

  return { settings, update };
}

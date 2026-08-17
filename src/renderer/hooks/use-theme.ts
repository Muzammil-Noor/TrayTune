import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "traytune.theme";
// Interim persistence: moves into the settings service (Phase 3+) with the
// rest of user configuration.

function loadPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** Owns the Light/Dark/System theme preference (tasks 1.16–1.18). "System"
 * follows the Windows app theme via prefers-color-scheme, which Electron keeps
 * in sync with the OS. Applies the `.dark` class to <html>. */
export function useTheme() {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(loadPreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isDark =
    preference === "dark" || (preference === "system" && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return { preference, isDark, setPreference };
}

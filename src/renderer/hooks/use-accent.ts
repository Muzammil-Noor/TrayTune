import { useEffect, useState } from "react";

/** Mixes a #rrggbb color toward white — approximates the lighter accent
 * variants WinUI uses on dark backgrounds. */
function lighten(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/** Applies the Windows accent color to the theme tokens (task 1.19), keeping
 * the CSS fallback accent when it cannot be retrieved. Returns the active
 * Windows accent, or null when running on the fallback. */
export function useAccent(): string | null {
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    function apply(color: string) {
      if (disposed || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
      const root = document.documentElement.style;
      root.setProperty("--accent-base", color);
      root.setProperty("--accent-light", lighten(color, 0.45));
      setAccent(color);
    }

    window.traytune?.system
      .getAccentColor()
      .then((color) => {
        if (color) apply(color);
      })
      .catch(() => {
        /* keep the CSS fallback accent */
      });

    const unsubscribe = window.traytune?.system.onAccentColorChanged(apply);
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  return accent;
}

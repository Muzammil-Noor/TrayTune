import { useEffect } from "react";
import type { AppSettings, StartupMode } from "@shared/types";
import type { ThemePreference } from "@/hooks/use-theme";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { SettingRow } from "./SettingRow";
import { glyphs } from "@/lib/glyphs";

interface SettingsPageProps {
  themePreference: ThemePreference;
  /** True when the accent comes from Windows, false on the fallback accent. */
  usingWindowsAccent: boolean;
  /** null while settings are loading/unavailable. */
  settings: AppSettings | null;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onThemeChange: (preference: ThemePreference) => void;
  onBack: () => void;
}

/** Full-window settings page, Windows Settings-style (task §35). Opened from
 * the sidebar gear; closed with the back arrow or Escape. */
export function SettingsPage({
  themePreference,
  usingWindowsAccent,
  settings,
  onUpdate,
  onThemeChange,
  onBack,
}: SettingsPageProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-window">
      <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-4">
        <Button
          variant="subtle"
          size="icon"
          title="Back"
          aria-label="Back"
          onClick={onBack}
        >
          <Icon glyph={glyphs.back} />
        </Button>
        <h2 className="text-xl font-semibold">Settings</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <h3 className="pb-1 pt-4 text-base font-semibold">Appearance</h3>

          <SettingRow
            title="Theme"
            description="Choose how TrayTune looks, or follow your Windows theme."
          >
            <Select
              aria-label="Theme"
              className="w-32"
              value={themePreference}
              onChange={(event) =>
                onThemeChange(event.currentTarget.value as ThemePreference)
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </SettingRow>

          <SettingRow
            title="Accent color"
            description={
              usingWindowsAccent
                ? "Using your Windows accent color."
                : "Using the default accent color."
            }
          >
            <span className="block size-5 rounded-full border border-stroke-strong bg-accent" />
          </SettingRow>

          <h3 className="pb-1 pt-4 text-base font-semibold">Behavior</h3>

          <SettingRow
            title="Keep running in the tray"
            description="The close button hides TrayTune in the system tray instead of quitting."
          >
            <ToggleSwitch
              checked={settings?.closeToTray ?? true}
              disabled={settings === null}
              aria-label="Keep running in the tray"
              onChange={(value) => onUpdate({ closeToTray: value })}
            />
          </SettingRow>

          <SettingRow
            title="Run on startup"
            description="Start TrayTune automatically when you sign in to Windows."
          >
            <ToggleSwitch
              checked={settings?.runOnStartup ?? false}
              disabled={settings === null}
              aria-label="Run on startup"
              onChange={(value) => onUpdate({ runOnStartup: value })}
            />
          </SettingRow>

          <SettingRow
            title="Startup behavior"
            description="Start hidden in the tray or with the main window open. Applies to sign-in launches only."
          >
            <Select
              aria-label="Startup behavior"
              className="w-32"
              value={settings?.startupMode ?? "tray"}
              disabled={settings === null || settings.runOnStartup !== true}
              onChange={(event) =>
                onUpdate({
                  startupMode: event.currentTarget.value as StartupMode,
                })
              }
            >
              <option value="tray">Tray</option>
              <option value="window">Window</option>
            </Select>
          </SettingRow>

          <h3 className="pb-1 pt-4 text-base font-semibold">Flyout</h3>

          <SettingRow
            title="Collapse sidebar after selecting a playlist"
            description="Close the flyout's playlist drawer once you pick a playlist."
          >
            <ToggleSwitch
              checked={settings?.flyoutCollapseSidebarOnSelect ?? true}
              disabled={settings === null}
              aria-label="Collapse sidebar after selecting a playlist"
              onChange={(value) =>
                onUpdate({ flyoutCollapseSidebarOnSelect: value })
              }
            />
          </SettingRow>

          <SettingRow
            title="Collapse song list after selecting a song"
            description="Return the flyout to compact mode when you pick a song."
          >
            <ToggleSwitch
              checked={settings?.flyoutCollapseSongListOnPlay ?? false}
              disabled={settings === null}
              aria-label="Collapse song list after selecting a song"
              onChange={(value) =>
                onUpdate({ flyoutCollapseSongListOnPlay: value })
              }
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

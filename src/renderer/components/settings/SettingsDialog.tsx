import type { AppSettings, StartupMode } from "@shared/types";
import type { ThemePreference } from "@/hooks/use-theme";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

interface SettingsDialogProps {
  open: boolean;
  themePreference: ThemePreference;
  /** True when the accent comes from Windows, false on the fallback accent. */
  usingWindowsAccent: boolean;
  /** null while settings are loading/unavailable. */
  settings: AppSettings | null;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onThemeChange: (preference: ThemePreference) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const STARTUP_MODE_OPTIONS: {
  value: StartupMode;
  label: string;
  title: string;
}[] = [
  {
    value: "tray",
    label: "Tray",
    title: "Start hidden in the tray with the flyout ready",
  },
  {
    value: "window",
    label: "Window",
    title: "Start with the main window open",
  },
];

interface ToggleRowProps {
  label: string;
  checked: boolean | undefined;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-secondary">{label}</span>
      <ToggleSwitch
        checked={checked ?? false}
        disabled={checked === undefined}
        aria-label={label}
        onChange={onChange}
      />
    </div>
  );
}

/** Minimal settings surface for Phase 1 (theme + accent info). Grows into the
 * full settings area (§35) once the settings service exists. */
export function SettingsDialog({
  open,
  themePreference,
  usingWindowsAccent,
  settings,
  onUpdate,
  onThemeChange,
  onClose,
}: SettingsDialogProps) {
  return (
    <Dialog
      open={open}
      title="Settings"
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="pb-2 text-sm font-medium">Theme</h3>
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                role="radio"
                aria-checked={themePreference === option.value}
                variant={
                  themePreference === option.value ? "accent" : "standard"
                }
                onClick={() => onThemeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="pb-2 text-sm font-medium">Accent color</h3>
          <div className="flex items-center gap-2 text-sm text-secondary">
            <span className="size-4 rounded-full border border-stroke-strong bg-accent" />
            {usingWindowsAccent
              ? "Using your Windows accent color"
              : "Using the default accent color"}
          </div>
        </section>

        <section>
          <h3 className="pb-2 text-sm font-medium">Behavior</h3>
          <div className="flex flex-col gap-3">
            <ToggleRow
              label="Keep running in the tray when the window is closed"
              checked={settings?.closeToTray}
              onChange={(value) => onUpdate({ closeToTray: value })}
            />
            <ToggleRow
              label="Run on startup when you sign in to Windows"
              checked={settings?.runOnStartup}
              onChange={(value) => onUpdate({ runOnStartup: value })}
            />
            {settings?.runOnStartup === true && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-secondary">Startup behavior</span>
                <div
                  className="flex gap-2"
                  role="radiogroup"
                  aria-label="Startup behavior"
                >
                  {STARTUP_MODE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      role="radio"
                      title={option.title}
                      aria-checked={settings.startupMode === option.value}
                      variant={
                        settings.startupMode === option.value
                          ? "accent"
                          : "standard"
                      }
                      onClick={() => onUpdate({ startupMode: option.value })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="pb-2 text-sm font-medium">Flyout</h3>
          <div className="flex flex-col gap-3">
            <ToggleRow
              label="Collapse sidebar after selecting a playlist"
              checked={settings?.flyoutCollapseSidebarOnSelect}
              onChange={(value) =>
                onUpdate({ flyoutCollapseSidebarOnSelect: value })
              }
            />
            <ToggleRow
              label="Collapse song list after selecting a song"
              checked={settings?.flyoutCollapseSongListOnPlay}
              onChange={(value) =>
                onUpdate({ flyoutCollapseSongListOnPlay: value })
              }
            />
          </div>
        </section>
      </div>
    </Dialog>
  );
}

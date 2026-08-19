import type { StartupMode } from "@shared/types";
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
  closeToTray: boolean | null;
  /** null while settings are loading/unavailable. */
  runOnStartup: boolean | null;
  /** null while settings are loading/unavailable. */
  startupMode: StartupMode | null;
  onCloseToTrayChange: (value: boolean) => void;
  onRunOnStartupChange: (value: boolean) => void;
  onStartupModeChange: (value: StartupMode) => void;
  onThemeChange: (preference: ThemePreference) => void;
  onClose: () => void;
}

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

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Minimal settings surface for Phase 1 (theme + accent info). Grows into the
 * full settings area (§35) once the settings service exists. */
export function SettingsDialog({
  open,
  themePreference,
  usingWindowsAccent,
  closeToTray,
  runOnStartup,
  startupMode,
  onCloseToTrayChange,
  onRunOnStartupChange,
  onStartupModeChange,
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
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-secondary">
                Keep running in the tray when the window is closed
              </span>
              <ToggleSwitch
                checked={closeToTray ?? true}
                disabled={closeToTray === null}
                aria-label="Keep running in the tray when the window is closed"
                onChange={onCloseToTrayChange}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-secondary">
                Run on startup when you sign in to Windows
              </span>
              <ToggleSwitch
                checked={runOnStartup ?? false}
                disabled={runOnStartup === null}
                aria-label="Run on startup when you sign in to Windows"
                onChange={onRunOnStartupChange}
              />
            </div>
            {runOnStartup === true && (
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
                      aria-checked={startupMode === option.value}
                      variant={
                        startupMode === option.value ? "accent" : "standard"
                      }
                      disabled={startupMode === null}
                      onClick={() => onStartupModeChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}

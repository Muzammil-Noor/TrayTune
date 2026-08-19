import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  onChange: (checked: boolean) => void;
}

/** Win11-style toggle switch. */
export function ToggleSwitch({
  checked,
  disabled,
  className,
  onChange,
  ...aria
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria["aria-label"]}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        // shrink-0: never let long labels in flex rows squeeze the switch
        "h-5 w-10 shrink-0 rounded-full border outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-40",
        checked
          ? "border-accent bg-accent hover:bg-accent/90"
          : "border-tertiary bg-transparent hover:bg-subtle",
        className,
      )}
    >
      <span
        className={cn(
          "block size-3 rounded-full transition-all",
          checked ? "ml-5.5 bg-white dark:bg-[#1b1b1b]" : "ml-0.75 bg-secondary",
        )}
      />
    </button>
  );
}

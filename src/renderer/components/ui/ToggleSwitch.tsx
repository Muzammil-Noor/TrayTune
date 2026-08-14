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
        "h-5 w-10 rounded-full border outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900/75 disabled:pointer-events-none disabled:opacity-40",
        checked
          ? "border-accent bg-accent hover:bg-accent/90"
          : "border-neutral-500 bg-transparent hover:bg-black/5",
        className,
      )}
    >
      <span
        className={cn(
          "block size-3 rounded-full transition-all",
          checked
            ? "ml-[22px] bg-white"
            : "ml-[3px] bg-neutral-600",
        )}
      />
    </button>
  );
}

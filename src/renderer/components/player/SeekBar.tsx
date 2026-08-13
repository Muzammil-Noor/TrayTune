import { Slider } from "@/components/ui/Slider";
import { formatDuration } from "@/lib/format";

interface SeekBarProps {
  position: number;
  /** Track duration in seconds; undefined when unknown or nothing is loaded. */
  duration: number | undefined;
  disabled: boolean;
  onSeek: (position: number) => void;
}

/** Progress slider with current time and duration labels (task 1.12). */
export function SeekBar({ position, duration, disabled, onSeek }: SeekBarProps) {
  const hasDuration = duration !== undefined && duration > 0;

  return (
    <div className="flex w-full max-w-130 items-center gap-3">
      <span className="w-10 text-right text-xs tabular-nums text-neutral-500">
        {disabled ? "--:--" : formatDuration(position)}
      </span>
      <Slider
        value={hasDuration ? Math.min(position, duration) : 0}
        max={hasDuration ? duration : 1}
        disabled={disabled || !hasDuration}
        aria-label="Seek"
        aria-valuetext={`${formatDuration(position)} of ${formatDuration(duration)}`}
        className="flex-1"
        onChange={onSeek}
      />
      <span className="w-10 text-xs tabular-nums text-neutral-500">
        {disabled ? "--:--" : formatDuration(duration)}
      </span>
    </div>
  );
}

import { useState } from "react";
import { Slider } from "@/components/ui/Slider";
import { formatDuration } from "@/lib/format";

interface SeekBarProps {
  position: number;
  /** Track duration in seconds; undefined when unknown or nothing is loaded. */
  duration: number | undefined;
  disabled: boolean;
  onSeek: (position: number) => void;
}

/** Progress slider with current time and duration labels (tasks 4.7–4.9).
 * While the user scrubs, the local value wins over live position updates so
 * the thumb never fights the ~4 Hz timeupdate stream; every move seeks, and
 * releasing commits and hands control back to playback. */
export function SeekBar({ position, duration, disabled, onSeek }: SeekBarProps) {
  const [scrub, setScrub] = useState<number | null>(null);
  const hasDuration = duration !== undefined && duration > 0;
  const shown = scrub ?? position;

  return (
    <div className="flex w-full max-w-130 items-center gap-3">
      <span className="w-10 text-right text-xs tabular-nums text-neutral-500">
        {disabled ? "--:--" : formatDuration(shown)}
      </span>
      <Slider
        value={hasDuration ? Math.min(shown, duration) : 0}
        max={hasDuration ? duration : 1}
        step={0.1}
        disabled={disabled || !hasDuration}
        aria-label="Seek"
        aria-valuetext={`${formatDuration(shown)} of ${formatDuration(duration)}`}
        className="flex-1"
        onChange={(value) => {
          setScrub(value);
          onSeek(value);
        }}
        onCommit={(value) => {
          onSeek(value);
          setScrub(null);
        }}
      />
      <span className="w-10 text-xs tabular-nums text-neutral-500">
        {disabled ? "--:--" : formatDuration(duration)}
      </span>
    </div>
  );
}

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  max: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
  "aria-valuetext"?: string;
  onChange: (value: number) => void;
}

/** Win11-style slider built on input[type=range] so keyboard interaction and
 * screen-reader semantics come for free. Visuals live in styles/index.css. */
export function Slider({
  value,
  max,
  min = 0,
  step = 1,
  disabled,
  className,
  onChange,
  ...aria
}: SliderProps) {
  const range = max - min;
  const fill = range > 0 ? ((value - min) / range) * 100 : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={aria["aria-label"]}
      aria-valuetext={aria["aria-valuetext"]}
      className={cn("slider", className)}
      style={{ "--slider-fill": `${fill}%` } as CSSProperties}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
    />
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Slider } from "@/components/ui/Slider";
import { glyphs } from "@/lib/glyphs";

interface VolumeControlProps {
  /** 0..1 */
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  /** Interaction finished — the moment to persist. */
  onVolumeCommit: (volume: number) => void;
  onToggleMute: () => void;
}

function volumeGlyph(volume: number, muted: boolean): string {
  if (muted || volume === 0) return glyphs.mute;
  if (volume < 0.34) return glyphs.volume1;
  if (volume < 0.67) return glyphs.volume2;
  return glyphs.volume3;
}

/** Mute toggle + volume slider (task 4.14). The slider works in percent;
 * the engine takes 0..1. While dragging, the local value wins — the engine
 * echoes volume back asynchronously (volumechange), and a controlled input
 * with a stale prop gets its DOM value restored by React, which would make
 * the commit read the old value. */
export function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onVolumeCommit,
  onToggleMute,
}: VolumeControlProps) {
  const [scrub, setScrub] = useState<number | null>(null);
  const percent = scrub ?? Math.round(volume * 100);
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="subtle"
        size="icon"
        title={muted ? "Unmute" : "Mute"}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={onToggleMute}
      >
        <Icon glyph={volumeGlyph(volume, muted)} />
      </Button>
      <Slider
        value={muted && scrub === null ? 0 : percent}
        max={100}
        aria-label="Volume"
        aria-valuetext={muted ? "Muted" : `${percent}%`}
        className="w-24"
        onChange={(value) => {
          setScrub(value);
          onVolumeChange(value / 100);
        }}
        onCommit={(value) => {
          onVolumeCommit(value / 100);
          setScrub(null);
        }}
      />
    </div>
  );
}

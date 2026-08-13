import type { RepeatMode } from "@shared/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { glyphs } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

interface PlaybackModeControlsProps {
  shuffle: boolean;
  repeat: RepeatMode;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

const repeatTitle: Record<RepeatMode, string> = {
  off: "Repeat: off",
  all: "Repeat: playlist",
  one: "Repeat: track",
};

/** Shuffle toggle and repeat mode cycle (task 1.13). */
export function PlaybackModeControls({
  shuffle,
  repeat,
  onToggleShuffle,
  onCycleRepeat,
}: PlaybackModeControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="subtle"
        size="icon"
        title={shuffle ? "Shuffle: on" : "Shuffle: off"}
        aria-label="Toggle shuffle"
        aria-pressed={shuffle}
        className={cn(shuffle && "bg-accent/10 text-accent hover:bg-accent/15")}
        onClick={onToggleShuffle}
      >
        <Icon glyph={glyphs.shuffle} />
      </Button>
      <Button
        variant="subtle"
        size="icon"
        title={repeatTitle[repeat]}
        aria-label="Cycle repeat mode"
        aria-pressed={repeat !== "off"}
        className={cn(
          repeat !== "off" && "bg-accent/10 text-accent hover:bg-accent/15",
        )}
        onClick={onCycleRepeat}
      >
        <Icon
          glyph={repeat === "one" ? glyphs.repeatOne : glyphs.repeatAll}
        />
      </Button>
    </div>
  );
}

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { glyphs } from "@/lib/glyphs";

interface PlaybackControlsProps {
  isPlaying: boolean;
  canSkip: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/** Previous / Play-Pause / Next (task 1.11). */
export function PlaybackControls({
  isPlaying,
  canSkip,
  onTogglePlay,
  onPrevious,
  onNext,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="subtle"
        size="icon"
        title="Previous"
        aria-label="Previous"
        disabled={!canSkip}
        onClick={onPrevious}
      >
        <Icon glyph={glyphs.previous} />
      </Button>
      <Button
        variant="accent"
        size="iconLg"
        title={isPlaying ? "Pause" : "Play"}
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={onTogglePlay}
      >
        <Icon glyph={isPlaying ? glyphs.pause : glyphs.play} className="text-lg" />
      </Button>
      <Button
        variant="subtle"
        size="icon"
        title="Next"
        aria-label="Next"
        disabled={!canSkip}
        onClick={onNext}
      >
        <Icon glyph={glyphs.next} />
      </Button>
    </div>
  );
}

import type { PlayerAction, PlayerStateSnapshot } from "@shared/types";
import { PlaybackControls } from "@/components/player/PlaybackControls";
import { PlaybackModeControls } from "@/components/player/PlaybackModeControls";
import { SeekBar } from "@/components/player/SeekBar";
import { TrackInfo } from "@/components/player/TrackInfo";

interface FlyoutPlayerProps {
  state: PlayerStateSnapshot;
  onAction: (action: PlayerAction) => void;
}

/** Compact, vertically stacked player for the 380px flyout. */
export function FlyoutPlayer({ state, onAction }: FlyoutPlayerProps) {
  return (
    <footer className="flex shrink-0 flex-col gap-1.5 border-t border-stroke bg-surface-secondary px-4 pb-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <TrackInfo track={state.currentTrack} />
        <PlaybackModeControls
          shuffle={state.shuffle}
          repeat={state.repeat}
          onToggleShuffle={() => onAction({ type: "toggle-shuffle" })}
          onCycleRepeat={() => onAction({ type: "cycle-repeat" })}
        />
      </div>
      <SeekBar
        position={state.position}
        duration={state.currentTrack?.duration}
        disabled={state.currentTrack === null}
        onSeek={(position) => onAction({ type: "seek", position })}
      />
      <div className="flex justify-center">
        <PlaybackControls
          isPlaying={state.isPlaying}
          canSkip={state.tracks.length > 0}
          onTogglePlay={() => onAction({ type: "play-pause" })}
          onPrevious={() => onAction({ type: "previous" })}
          onNext={() => onAction({ type: "next" })}
        />
      </div>
    </footer>
  );
}

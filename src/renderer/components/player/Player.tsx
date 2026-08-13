import type { RepeatMode, Track } from "@shared/types";
import { PlaybackControls } from "./PlaybackControls";
import { PlaybackModeControls } from "./PlaybackModeControls";
import { SeekBar } from "./SeekBar";
import { TrackInfo } from "./TrackInfo";

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  shuffle: boolean;
  repeat: RepeatMode;
  canSkip: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (position: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

/** Bottom player bar composing TrackInfo, PlaybackControls, SeekBar and
 * PlaybackModeControls (tasks 1.10–1.13). */
export function Player({
  currentTrack,
  isPlaying,
  position,
  shuffle,
  repeat,
  canSkip,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
}: PlayerProps) {
  return (
    <footer className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-t border-black/8 bg-[#fbfbfb] px-4 py-3">
      <TrackInfo track={currentTrack} />

      <div className="flex flex-col items-center gap-1.5">
        <PlaybackControls
          isPlaying={isPlaying}
          canSkip={canSkip}
          onTogglePlay={onTogglePlay}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <SeekBar
          position={position}
          duration={currentTrack?.duration}
          disabled={currentTrack === null}
          onSeek={onSeek}
        />
      </div>

      <div className="justify-self-end">
        <PlaybackModeControls
          shuffle={shuffle}
          repeat={repeat}
          onToggleShuffle={onToggleShuffle}
          onCycleRepeat={onCycleRepeat}
        />
      </div>
    </footer>
  );
}

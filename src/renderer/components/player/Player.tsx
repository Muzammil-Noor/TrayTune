import type { RepeatMode, Track } from "@shared/types";
import { PlaybackControls } from "./PlaybackControls";
import { PlaybackModeControls } from "./PlaybackModeControls";
import { SeekBar } from "./SeekBar";
import { TrackInfo } from "./TrackInfo";
import { VolumeControl } from "./VolumeControl";

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  /** Real duration from the audio engine; null until known. */
  duration: number | null;
  /** Non-fatal playback failure for the current track. */
  playbackError: string | null;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  canSkip: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onVolumeCommit: (volume: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

/** Bottom player bar composing TrackInfo, PlaybackControls, SeekBar and
 * PlaybackModeControls (tasks 1.10–1.13). The middle column is fluid so the
 * bar adapts to narrow windows (task 1.20). */
export function Player({
  currentTrack,
  isPlaying,
  position,
  duration,
  playbackError,
  volume,
  muted,
  shuffle,
  repeat,
  canSkip,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onVolumeCommit,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
}: PlayerProps) {
  return (
    <footer className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-4 border-t border-stroke bg-surface-secondary px-4 py-3">
      <TrackInfo track={currentTrack} error={playbackError} />

      <div className="flex w-full flex-col items-center gap-1.5 justify-self-center">
        <PlaybackControls
          isPlaying={isPlaying}
          canSkip={canSkip}
          onTogglePlay={onTogglePlay}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <SeekBar
          position={position}
          duration={duration ?? currentTrack?.duration}
          disabled={currentTrack === null}
          onSeek={onSeek}
        />
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <VolumeControl
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onVolumeCommit={onVolumeCommit}
          onToggleMute={onToggleMute}
        />
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

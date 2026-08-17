import { useState } from "react";
import type { Track, TrackId } from "@shared/types";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/format";
import { glyphs } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

interface TrackListProps {
  playlistName?: string;
  tracks: Track[];
  currentTrackId: TrackId | null;
  onPlay: (trackId: TrackId) => void;
  onRemoveFromPlaylist: (trackId: TrackId) => void;
  onRemoveFromLibrary: (trackId: TrackId) => void;
}

type MenuState = { x: number; y: number; track: Track } | null;

export function TrackList({
  playlistName,
  tracks,
  currentTrackId,
  onPlay,
  onRemoveFromPlaylist,
  onRemoveFromLibrary,
}: TrackListProps) {
  const [menu, setMenu] = useState<MenuState>(null);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="px-6 pb-2 pt-5">
        <h2 className="truncate text-xl font-semibold">
          {playlistName ?? "No playlist selected"}
        </h2>
        <p className="pt-0.5 text-xs text-secondary">
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        </p>
      </header>

      {tracks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-10 text-tertiary">
          <Icon glyph={glyphs.musicNote} className="text-4xl" />
          <p className="text-sm">
            {playlistName
              ? "This playlist is empty."
              : "Create a playlist to get started."}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {tracks.map((track, index) => {
            const isCurrent = track.id === currentTrackId;
            return (
              <button
                key={track.id}
                type="button"
                onDoubleClick={() => onPlay(track.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onPlay(track.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, track });
                }}
                className={cn(
                  "grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
                  isCurrent
                    ? "bg-accent/8"
                    : "hover:bg-subtle active:bg-subtle-strong",
                )}
              >
                <span className="flex justify-center">
                  {isCurrent ? (
                    <Icon glyph={glyphs.volume} className="text-sm text-accent" />
                  ) : (
                    <span className="text-sm tabular-nums text-secondary">
                      {index + 1}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      isCurrent ? "font-medium text-accent" : "text-primary",
                    )}
                  >
                    {track.title}
                  </span>
                  <span className="block truncate text-xs text-secondary">
                    {track.artist ?? "Unknown artist"}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-secondary">
                  {formatDuration(track.duration)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Play",
              glyph: glyphs.play,
              onSelect: () => onPlay(menu.track.id),
            },
            { type: "separator" },
            {
              label: "Remove from playlist",
              glyph: glyphs.cancel,
              onSelect: () => onRemoveFromPlaylist(menu.track.id),
            },
            {
              label: "Remove from library",
              glyph: glyphs.delete,
              danger: true,
              onSelect: () => onRemoveFromLibrary(menu.track.id),
            },
          ]}
        />
      )}
    </section>
  );
}

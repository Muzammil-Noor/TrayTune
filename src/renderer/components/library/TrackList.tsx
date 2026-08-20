import { useEffect, useRef, useState } from "react";
import type { AddTracksResult, Track, TrackId } from "@shared/types";
import { Button } from "@/components/ui/Button";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/format";
import { glyphs } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

interface TrackListProps {
  title: string;
  /** Library view: all tracks, an Add-music entry point, and no
   * remove-from-playlist action. */
  isLibrary: boolean;
  tracks: Track[];
  currentTrackId: TrackId | null;
  onPlay: (trackId: TrackId) => void;
  onRemoveFromPlaylist: (trackId: TrackId) => void;
  onRemoveFromLibrary: (trackId: TrackId) => void;
  /** Present only where importing makes sense (the main window). */
  onAddFiles?: () => Promise<AddTracksResult | null>;
}

type MenuState = { x: number; y: number; track: Track } | null;

function importSummary(result: AddTracksResult): string | null {
  if (result.canceled) return null;
  const parts: string[] = [];
  parts.push(
    result.added.length === 1 ? "Added 1 track" : `Added ${result.added.length} tracks`,
  );
  if (result.duplicateCount > 0) {
    parts.push(`${result.duplicateCount} already in your library`);
  }
  if (result.failedCount > 0) {
    parts.push(`${result.failedCount} failed`);
  }
  return parts.join(" · ");
}

export function TrackList({
  title,
  isLibrary,
  tracks,
  currentTrackId,
  onPlay,
  onRemoveFromPlaylist,
  onRemoveFromLibrary,
  onAddFiles,
}: TrackListProps) {
  const [menu, setMenu] = useState<MenuState>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const statusTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(statusTimer.current), []);

  async function handleAddFiles() {
    if (!onAddFiles || importing) return;
    setImporting(true);
    try {
      const result = await onAddFiles();
      const summary = result && importSummary(result);
      if (summary) {
        setImportStatus(summary);
        window.clearTimeout(statusTimer.current);
        statusTimer.current = window.setTimeout(
          () => setImportStatus(null),
          6000,
        );
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-end justify-between gap-4 px-6 pb-2 pt-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{title}</h2>
          <p className="pt-0.5 text-xs text-secondary">
            {importStatus ??
              `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`}
          </p>
        </div>
        {isLibrary && onAddFiles && (
          <Button
            className="shrink-0"
            disabled={importing}
            onClick={() => void handleAddFiles()}
          >
            <Icon glyph={glyphs.add} className="text-sm" />
            {importing ? "Adding…" : "Add music"}
          </Button>
        )}
      </header>

      {tracks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-10 text-tertiary">
          <Icon glyph={glyphs.musicNote} className="text-4xl" />
          <p className="text-sm">
            {isLibrary ? "Your library is empty." : "This playlist is empty."}
          </p>
          {isLibrary && onAddFiles && (
            <Button
              variant="accent"
              disabled={importing}
              onClick={() => void handleAddFiles()}
            >
              <Icon glyph={glyphs.add} className="text-sm" />
              {importing ? "Adding…" : "Add music"}
            </Button>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {tracks.map((track, index) => {
            const isCurrent = track.id === currentTrackId;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onPlay(track.id)}
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
            ...(isLibrary
              ? []
              : [
                  {
                    label: "Remove from playlist",
                    glyph: glyphs.cancel,
                    onSelect: () => onRemoveFromPlaylist(menu.track.id),
                  } as const,
                ]),
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

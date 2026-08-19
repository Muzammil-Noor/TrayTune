import type { PlaylistId, PlayerStateSnapshot } from "@shared/types";
import { Icon } from "@/components/ui/Icon";
import { glyphs } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

interface PlaylistDrawerProps {
  playlists: PlayerStateSnapshot["playlists"];
  selectedPlaylistId: PlaylistId | null;
  /** True while the exit animation plays; onExited fires when it finishes. */
  closing: boolean;
  onSelect: (playlistId: PlaylistId) => void;
  onClose: () => void;
  onExited: () => void;
}

/** Collapsible playlist drawer for the flyout — selection only; full playlist
 * management lives in the main window. The parent keeps it mounted during the
 * exit animation via the `closing` flag. */
export function PlaylistDrawer({
  playlists,
  selectedPlaylistId,
  closing,
  onSelect,
  onClose,
  onExited,
}: PlaylistDrawerProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-40 bg-black/40 duration-150",
        closing
          ? "animate-out fade-out fill-mode-forwards"
          : "animate-in fade-in",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closing) onClose();
      }}
    >
      <div
        className={cn(
          "absolute left-0 top-0 flex h-full w-56 flex-col border-r border-stroke bg-surface shadow-lg duration-150",
          closing
            ? "animate-out slide-out-to-left fill-mode-forwards"
            : "animate-in slide-in-from-left",
        )}
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) onExited();
        }}
      >
        {/* pt clears the floating playlists button in the flyout header */}
        <p className="px-4 pb-1 pt-11 text-xs font-medium uppercase tracking-wide text-secondary">
          Playlists
        </p>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
          {playlists.map((playlist) => {
            const selected = playlist.id === selectedPlaylistId;
            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => onSelect(playlist.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
                  selected
                    ? "bg-subtle font-medium"
                    : "hover:bg-subtle active:bg-subtle-strong",
                )}
              >
                {selected && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-full bg-accent" />
                )}
                <Icon
                  glyph={glyphs.bulletedList}
                  className="text-sm text-secondary"
                />
                <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
                <span className="text-xs tabular-nums text-secondary">
                  {playlist.trackCount}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { PlayerAction, PlayerStateSnapshot } from "@shared/types";
import { FlyoutPlayer } from "./components/flyout/FlyoutPlayer";
import { PlaylistDrawer } from "./components/flyout/PlaylistDrawer";
import { TrackList } from "./components/library/TrackList";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { useAccent } from "./hooks/use-accent";
import { useTheme } from "./hooks/use-theme";
import { glyphs } from "./lib/glyphs";

/** Mini player shown above the tray (tray left-click). Renders the player
 * state owned by the main window and sends actions back — it holds no player
 * state of its own (PRD §10.4). */
export default function FlyoutApp() {
  useTheme();
  useAccent();
  const [state, setState] = useState<PlayerStateSnapshot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    return window.traytune?.player.onState(setState);
  }, []);

  // Escape closes the drawer first, then the flyout itself.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawerOpen((open) => {
        if (!open) window.traytune?.flyout.hide();
        return false;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const send = (action: PlayerAction) =>
    window.traytune?.player.sendAction(action);

  const selectedPlaylist = state?.playlists.find(
    (playlist) => playlist.id === state.selectedPlaylistId,
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden border border-stroke bg-window">
      <header className="flex shrink-0 items-center gap-1 px-2 py-1.5">
        <Button
          variant="subtle"
          size="icon"
          title="Playlists"
          aria-label="Playlists"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <Icon glyph={glyphs.navButton} />
        </Button>
        <h1 className="pl-1 text-sm font-semibold">TrayTune</h1>
        <span className="flex-1" />
        <Button
          variant="subtle"
          size="icon"
          title="Open TrayTune"
          aria-label="Open TrayTune"
          onClick={() => window.traytune?.flyout.openMainWindow()}
        >
          <Icon glyph={glyphs.openInNewWindow} />
        </Button>
      </header>

      {state ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col rounded-tl-lg border-l border-t border-stroke bg-surface">
            <TrackList
              playlistName={selectedPlaylist?.name}
              tracks={state.tracks}
              currentTrackId={state.currentTrack?.id ?? null}
              onPlay={(trackId) => send({ type: "play-track", trackId })}
              onRemoveFromPlaylist={(trackId) =>
                send({ type: "remove-from-playlist", trackId })
              }
              onRemoveFromLibrary={(trackId) =>
                send({ type: "remove-from-library", trackId })
              }
            />
          </div>
          <FlyoutPlayer state={state} onAction={send} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-tertiary">
          Connecting to TrayTune…
        </div>
      )}

      {drawerOpen && state && (
        <PlaylistDrawer
          playlists={state.playlists}
          selectedPlaylistId={state.selectedPlaylistId}
          onSelect={(playlistId) => send({ type: "select-playlist", playlistId })}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

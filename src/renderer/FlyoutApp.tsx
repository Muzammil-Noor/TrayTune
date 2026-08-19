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

/** "closing" keeps the drawer mounted while its exit animation plays. */
type DrawerPhase = "closed" | "open" | "closing";

/** Mini player shown above the tray (tray left-click). Renders the player
 * state owned by the main window and sends actions back — it holds no player
 * state of its own (PRD §10.4). Compact by default: the song list expands on
 * demand and the window resizes to match. */
export default function FlyoutApp() {
  useTheme();
  useAccent();
  const [state, setState] = useState<PlayerStateSnapshot | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [drawer, setDrawer] = useState<DrawerPhase>("closed");

  useEffect(() => {
    // Pull the cached snapshot first — the push sent on window load can race
    // this subscription, which left the flyout stuck on "Connecting…".
    let disposed = false;
    window.traytune?.player
      .getState()
      .then((snapshot) => {
        if (!disposed && snapshot) setState(snapshot);
      })
      .catch(() => {
        /* live pushes will fill in */
      });
    const unsubscribe = window.traytune?.player.onState(setState);
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  // Escape closes the drawer first, then the flyout itself.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawer((phase) => {
        if (phase === "open") return "closing";
        if (phase === "closed") window.traytune?.flyout.hide();
        return phase;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleList() {
    const next = !listExpanded;
    setListExpanded(next);
    if (!next) setDrawer("closed"); // the drawer only exists in expanded mode
    window.traytune?.flyout.setExpanded(next);
  }

  const send = (action: PlayerAction) =>
    window.traytune?.player.sendAction(action);

  const selectedPlaylist = state?.playlists.find(
    (playlist) => playlist.id === state.selectedPlaylistId,
  );

  const drawerOpen = drawer === "open";

  return (
    <div className="relative flex h-full flex-col overflow-hidden border border-stroke bg-window">
      <header className="flex shrink-0 items-center gap-1 px-2 py-1.5">
        {/* Floats above the drawer overlay so it can close the drawer too. */}
        <Button
          variant="subtle"
          size="icon"
          className="relative z-50"
          title={drawerOpen ? "Close playlists" : "Playlists"}
          aria-label={drawerOpen ? "Close playlists" : "Playlists"}
          aria-expanded={drawerOpen}
          disabled={!listExpanded}
          onClick={() => setDrawer((phase) => (phase === "open" ? "closing" : "open"))}
        >
          <Icon glyph={glyphs.navButton} />
        </Button>
        <h1 className="pl-1 text-sm font-semibold">TrayTune</h1>
        <span className="flex-1" />
        <Button
          variant="subtle"
          size="icon"
          title={listExpanded ? "Hide song list" : "Show song list"}
          aria-label={listExpanded ? "Hide song list" : "Show song list"}
          aria-expanded={listExpanded}
          onClick={toggleList}
        >
          <Icon glyph={listExpanded ? glyphs.chevronDown : glyphs.chevronUp} />
        </Button>
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
          {listExpanded && (
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
          )}
          <FlyoutPlayer state={state} onAction={send} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-tertiary">
          Connecting to TrayTune…
        </div>
      )}

      {drawer !== "closed" && state && listExpanded && (
        <PlaylistDrawer
          playlists={state.playlists}
          selectedPlaylistId={state.selectedPlaylistId}
          closing={drawer === "closing"}
          onSelect={(playlistId) => send({ type: "select-playlist", playlistId })}
          onClose={() => setDrawer("closing")}
          onExited={() => setDrawer("closed")}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type {
  PlayerAction,
  PlayerStateSnapshot,
  PlaylistId,
  TrackId,
} from "@shared/types";
import { FLYOUT_LIST_HEIGHT, FLYOUT_PADDING } from "@shared/constants/flyout";
import { FlyoutPlayer } from "./components/flyout/FlyoutPlayer";
import { PlaylistDrawer } from "./components/flyout/PlaylistDrawer";
import { TrackList } from "./components/library/TrackList";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { useAccent } from "./hooks/use-accent";
import { useAppSettings } from "./hooks/use-app-settings";
import { useTheme } from "./hooks/use-theme";
import { glyphs } from "./lib/glyphs";

/** "closing" keeps the drawer mounted while its exit animation plays. */
type DrawerPhase = "closed" | "open" | "closing";

/** Mini player shown above the tray (tray left-click). Renders the player
 * state owned by the main window and sends actions back — it holds no player
 * state of its own (PRD §10.4).
 *
 * The window is a fixed-size transparent shell (see constants/flyout.ts); the
 * card below is the visible flyout, anchored to the window's bottom edge. The
 * song list expands and collapses by animating its own height, which keeps the
 * player perfectly still — the window is never resized mid-animation. */
export default function FlyoutApp() {
  useTheme();
  useAccent();
  const { settings } = useAppSettings();
  const [state, setState] = useState<PlayerStateSnapshot | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [drawer, setDrawer] = useState<DrawerPhase>("closed");
  const cardRef = useRef<HTMLDivElement>(null);

  // The window is bigger than the card and see-through around it. Main needs
  // the card's height to know which part is interactive; everything else
  // passes clicks through to whatever shows through the gap. Observing every
  // height change is safe here — unlike window bounds, this only moves a
  // hit-test rectangle, so it can follow the animation frame by frame.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const report = () =>
      window.traytune?.flyout.setCardHeight(
        Math.ceil(card.getBoundingClientRect().height),
      );
    report();
    const observer = new ResizeObserver(report);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // The window is raised invisible and revealed once we have painted; without
  // that handshake a stray opaque frame blinks before the shell's own show
  // animation. Two frames: the first schedules the paint, the second runs
  // after it has been presented.
  useEffect(() => {
    return window.traytune?.flyout.onShown(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.traytune?.flyout.notifyReady());
      });
    });
  }, []);

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

  function setListTo(next: boolean) {
    setListExpanded(next);
    if (!next) setDrawer("closed"); // the drawer only exists in expanded mode
  }

  const send = (action: PlayerAction) =>
    window.traytune?.player.sendAction(action);

  function handlePlay(trackId: TrackId) {
    send({ type: "play-track", trackId });
    if (settings?.flyoutCollapseSongListOnPlay) setListTo(false);
  }

  function handleSelectPlaylist(playlistId: PlaylistId | null) {
    send({ type: "select-playlist", playlistId });
    // Default to auto-closing while settings are still loading.
    if (settings?.flyoutCollapseSidebarOnSelect ?? true) setDrawer("closing");
  }

  const selectedPlaylist = state?.playlists.find(
    (playlist) => playlist.id === state.selectedPlaylistId,
  );

  const drawerOpen = drawer === "open";

  return (
    <div
      className="flex h-full flex-col justify-end"
      style={{ padding: FLYOUT_PADDING }}
    >
      {/* See-through area above the card. Clicking it dismisses the flyout,
          matching what clicking outside a Windows flyout does. */}
      <div
        aria-hidden="true"
        className="min-h-0 flex-1"
        onMouseDown={() => window.traytune?.flyout.hide()}
      />

      <div
        ref={cardRef}
        className="relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-stroke bg-window shadow-2xl"
      >
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
            onClick={() =>
              setDrawer((phase) => (phase === "open" ? "closing" : "open"))
            }
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
            onClick={() => setListTo(!listExpanded)}
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
            {/* The one animating element. Height is the only thing that moves,
                and it moves above the player, so the player never shifts. */}
            <div
              // Stays mounted while collapsed so its height can transition;
              // inert keeps the clipped rows out of tab order.
              inert={!listExpanded}
              className="shrink-0 overflow-hidden rounded-tl-lg bg-surface transition-[height] duration-300 ease-out"
              style={{ height: listExpanded ? FLYOUT_LIST_HEIGHT : 0 }}
            >
              <div style={{ height: FLYOUT_LIST_HEIGHT }}>
                <TrackList
                  title={selectedPlaylist?.name ?? "Library"}
                  isLibrary={state.selectedPlaylistId === null}
                  tracks={state.tracks}
                  currentTrackId={state.currentTrack?.id ?? null}
                  onPlay={handlePlay}
                  onRemoveFromPlaylist={(trackId) =>
                    send({ type: "remove-from-playlist", trackId })
                  }
                  onRemoveFromLibrary={(trackId) =>
                    send({ type: "remove-from-library", trackId })
                  }
                />
              </div>
            </div>
            <FlyoutPlayer state={state} onAction={send} />
          </>
        ) : (
          <div className="flex h-24 items-center justify-center text-sm text-tertiary">
            Connecting to TrayTune…
          </div>
        )}

        {drawer !== "closed" && state && listExpanded && (
          <PlaylistDrawer
            playlists={state.playlists}
            selectedPlaylistId={state.selectedPlaylistId}
            libraryTrackCount={state.libraryTrackCount}
            closing={drawer === "closing"}
            onSelect={handleSelectPlaylist}
            onClose={() => setDrawer("closing")}
            onExited={() => setDrawer("closed")}
          />
        )}
      </div>
    </div>
  );
}

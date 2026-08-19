import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TrackList } from "./components/library/TrackList";
import { Player } from "./components/player/Player";
import { SettingsDialog } from "./components/settings/SettingsDialog";
import { useAccent } from "./hooks/use-accent";
import { useAppSettings } from "./hooks/use-app-settings";
import { useMockPlayer } from "./hooks/use-mock-player";
import { useTheme } from "./hooks/use-theme";

export default function App() {
  const player = useMockPlayer();
  const theme = useTheme();
  const accent = useAccent();
  const appSettings = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Tray menu (and later media keys) drive the player through main-process
  // commands. The ref keeps the subscription stable across renders.
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    const unsubscribe = window.traytune?.player.onAction((action) => {
      const current = playerRef.current;
      switch (action.type) {
        case "play-pause":
          current.togglePlay();
          break;
        case "previous":
          current.previous();
          break;
        case "next":
          current.next();
          break;
        case "toggle-shuffle":
          current.toggleShuffle();
          break;
        case "cycle-repeat":
          current.cycleRepeat();
          break;
        case "seek":
          current.seek(action.position);
          break;
        case "play-track":
          current.playTrack(action.trackId);
          break;
        case "select-playlist":
          current.selectPlaylist(action.playlistId);
          break;
        case "remove-from-playlist":
          if (current.selectedPlaylist) {
            current.removeTrackFromPlaylist(
              current.selectedPlaylist.id,
              action.trackId,
            );
          }
          break;
        case "remove-from-library":
          current.removeTrackFromLibrary(action.trackId);
          break;
      }
    });
    return unsubscribe;
  }, []);

  // Report the full player state so the tray display (task 2.8) and the
  // flyout window stay in sync with this window's player.
  const {
    playlists,
    selectedPlaylistId,
    playlistTracks,
    currentTrack,
    isPlaying,
    position,
    shuffle,
    repeat,
  } = player;
  useEffect(() => {
    window.traytune?.player.reportState({
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        trackCount: playlist.trackIds.length,
      })),
      selectedPlaylistId,
      tracks: playlistTracks,
      currentTrack,
      isPlaying,
      position,
      shuffle,
      repeat,
    });
  }, [
    playlists,
    selectedPlaylistId,
    playlistTracks,
    currentTrack,
    isPlaying,
    position,
    shuffle,
    repeat,
  ]);

  return (
    <div className="flex h-full">
      <Sidebar
        playlists={player.playlists}
        selectedPlaylistId={player.selectedPlaylistId}
        onSelect={player.selectPlaylist}
        onAdd={player.addPlaylist}
        onRename={player.renamePlaylist}
        onDelete={player.deletePlaylist}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Content pane, Win11 NavigationView style: elevated surface with a
          rounded top-left corner sitting on the mica-toned window background. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-lg border-l border-t border-stroke bg-surface">
        <TrackList
          playlistName={player.selectedPlaylist?.name}
          tracks={player.playlistTracks}
          currentTrackId={player.currentTrackId}
          onPlay={player.playTrack}
          onRemoveFromPlaylist={(trackId) => {
            if (player.selectedPlaylist) {
              player.removeTrackFromPlaylist(player.selectedPlaylist.id, trackId);
            }
          }}
          onRemoveFromLibrary={player.removeTrackFromLibrary}
        />
        <Player
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          position={player.position}
          shuffle={player.shuffle}
          repeat={player.repeat}
          canSkip={player.playlistTracks.length > 0}
          onTogglePlay={player.togglePlay}
          onPrevious={player.previous}
          onNext={player.next}
          onSeek={player.seek}
          onToggleShuffle={player.toggleShuffle}
          onCycleRepeat={player.cycleRepeat}
        />
      </main>

      <SettingsDialog
        open={settingsOpen}
        themePreference={theme.preference}
        usingWindowsAccent={accent !== null}
        closeToTray={appSettings.settings?.closeToTray ?? null}
        runOnStartup={appSettings.settings?.runOnStartup ?? null}
        onCloseToTrayChange={(value) => appSettings.update({ closeToTray: value })}
        onRunOnStartupChange={(value) => appSettings.update({ runOnStartup: value })}
        onThemeChange={theme.setPreference}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

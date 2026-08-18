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
    const unsubscribe = window.traytune?.player.onCommand((command) => {
      const current = playerRef.current;
      if (command === "play-pause") current.togglePlay();
      else if (command === "previous") current.previous();
      else if (command === "next") current.next();
    });
    return unsubscribe;
  }, []);

  // Keep the tray display in sync with the current track (task 2.8).
  const { currentTrack, isPlaying } = player;
  useEffect(() => {
    window.traytune?.player.reportNowPlaying(
      currentTrack
        ? {
            title: currentTrack.title,
            artist: currentTrack.artist,
            isPlaying,
          }
        : null,
    );
  }, [currentTrack, isPlaying]);

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
        onCloseToTrayChange={(value) => appSettings.update({ closeToTray: value })}
        onThemeChange={theme.setPreference}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

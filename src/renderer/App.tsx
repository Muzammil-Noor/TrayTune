import { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TrackList } from "./components/library/TrackList";
import { Player } from "./components/player/Player";
import { SettingsDialog } from "./components/settings/SettingsDialog";
import { useAccent } from "./hooks/use-accent";
import { useMockPlayer } from "./hooks/use-mock-player";
import { useTheme } from "./hooks/use-theme";

export default function App() {
  const player = useMockPlayer();
  const theme = useTheme();
  const accent = useAccent();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        onThemeChange={theme.setPreference}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

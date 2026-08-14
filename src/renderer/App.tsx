import { Sidebar } from "./components/layout/Sidebar";
import { TrackList } from "./components/library/TrackList";
import { Player } from "./components/player/Player";
import { useMockPlayer } from "./hooks/use-mock-player";

export default function App() {
  const player = useMockPlayer();

  return (
    <div className="flex h-full">
      <Sidebar
        playlists={player.playlists}
        selectedPlaylistId={player.selectedPlaylistId}
        onSelect={player.selectPlaylist}
        onAdd={player.addPlaylist}
        onRename={player.renamePlaylist}
        onDelete={player.deletePlaylist}
      />

      {/* Content pane, Win11 NavigationView style: white surface with a rounded
          top-left corner sitting on the mica-toned window background. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-lg border-l border-t border-black/8 bg-white">
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
    </div>
  );
}

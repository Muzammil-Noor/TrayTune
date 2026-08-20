import { useMemo, useState } from "react";
import type {
  Playlist,
  PlaylistId,
  RepeatMode,
  Track,
  TrackId,
} from "@shared/types";
import { useLibrary } from "./use-library";

/**
 * Player state over the real library (Phase 3). Tracks come from the main
 * process's library store; a selectedPlaylistId of null means the Library
 * view (all tracks). Playback itself is still simulated — Phase 4 puts the
 * central PlaybackManager behind these same actions. Playlists remain
 * renderer state until their store lands in Phase 5.
 */
export function usePlayer() {
  const library = useLibrary();
  const { tracks } = library;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] =
    useState<PlaylistId | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<TrackId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  const trackMap = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );

  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;

  /** Tracks shown in the list: the whole library, or the selected playlist. */
  const playlistTracks = useMemo(
    () =>
      selectedPlaylist
        ? selectedPlaylist.trackIds
            .map((id) => trackMap.get(id))
            .filter((track): track is Track => track !== undefined)
        : tracks,
    [selectedPlaylist, trackMap, tracks],
  );

  // The current track can disappear underneath us (removed from the library
  // in another window). Deriving instead of storing makes that render as
  // "stopped" immediately — no effect, no ghost playback.
  const currentTrack = currentTrackId
    ? (trackMap.get(currentTrackId) ?? null)
    : null;
  const effectiveIsPlaying = isPlaying && currentTrack !== null;

  function playTrack(trackId: TrackId) {
    setCurrentTrackId(trackId);
    setIsPlaying(true);
    setPosition(0);
  }

  function togglePlay() {
    if (currentTrack) {
      setIsPlaying((playing) => !playing);
    } else if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0].id);
    }
  }

  function step(delta: 1 | -1) {
    if (playlistTracks.length === 0) return;
    const index = playlistTracks.findIndex(
      (track) => track.id === currentTrackId,
    );
    const nextIndex =
      index === -1
        ? 0
        : (index + delta + playlistTracks.length) % playlistTracks.length;
    playTrack(playlistTracks[nextIndex].id);
  }

  function cycleRepeat() {
    setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));
  }

  function addPlaylist(name: string) {
    const now = Date.now();
    const playlist: Playlist = {
      id: `playlist-${crypto.randomUUID()}`,
      name,
      trackIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setPlaylists((prev) => [...prev, playlist]);
    setSelectedPlaylistId(playlist.id);
  }

  function renamePlaylist(playlistId: PlaylistId, name: string) {
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId
          ? { ...playlist, name, updatedAt: Date.now() }
          : playlist,
      ),
    );
  }

  function deletePlaylist(playlistId: PlaylistId) {
    setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId));
    if (playlistId === selectedPlaylistId) {
      setSelectedPlaylistId(null); // fall back to the Library view
    }
  }

  function removeTrackFromPlaylist(playlistId: PlaylistId, trackId: TrackId) {
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              trackIds: playlist.trackIds.filter((id) => id !== trackId),
              updatedAt: Date.now(),
            }
          : playlist,
      ),
    );
  }

  function removeTrackFromLibrary(trackId: TrackId) {
    // The main process owns the library; the change comes back through the
    // library:changed broadcast. Playlist references are still renderer
    // state, so clean them here (their store arrives in Phase 5).
    library.removeTrack(trackId);
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.trackIds.includes(trackId)
          ? {
              ...playlist,
              trackIds: playlist.trackIds.filter((id) => id !== trackId),
              updatedAt: Date.now(),
            }
          : playlist,
      ),
    );
  }

  return {
    playlists,
    selectedPlaylist,
    selectedPlaylistId,
    playlistTracks,
    libraryTrackCount: tracks.length,
    currentTrack,
    currentTrackId,
    isPlaying: effectiveIsPlaying,
    position,
    shuffle,
    repeat,
    selectPlaylist: setSelectedPlaylistId,
    playTrack,
    togglePlay,
    next: () => step(1),
    previous: () => step(-1),
    seek: setPosition,
    toggleShuffle: () => setShuffle((enabled) => !enabled),
    cycleRepeat,
    addPlaylist,
    renamePlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    removeTrackFromLibrary,
    addFilesToLibrary: library.addTracks,
  };
}

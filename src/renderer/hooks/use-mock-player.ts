import { useMemo, useState } from "react";
import type {
  Playlist,
  PlaylistId,
  RepeatMode,
  Track,
  TrackId,
} from "@shared/types";
import { mockPlaylists, mockTracks } from "@/mock/mock-data";

/**
 * All Phase 1 UI state over the mock library. Nothing here touches real audio
 * or the filesystem — Phases 3–5 replace this with the library/playlist
 * services and the central PlaybackManager behind the preload API.
 */
export function useMockPlayer() {
  const [tracks, setTracks] = useState<Track[]>(mockTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<PlaylistId | null>(
    mockPlaylists[0]?.id ?? null,
  );
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

  const playlistTracks = useMemo(
    () =>
      selectedPlaylist
        ? selectedPlaylist.trackIds
            .map((id) => trackMap.get(id))
            .filter((track): track is Track => track !== undefined)
        : [],
    [selectedPlaylist, trackMap],
  );

  const currentTrack = currentTrackId
    ? (trackMap.get(currentTrackId) ?? null)
    : null;

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
    setPlaylists((prev) => {
      const remaining = prev.filter((playlist) => playlist.id !== playlistId);
      if (playlistId === selectedPlaylistId) {
        setSelectedPlaylistId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
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
    setTracks((prev) => prev.filter((track) => track.id !== trackId));
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
    if (trackId === currentTrackId) {
      setCurrentTrackId(null);
      setIsPlaying(false);
      setPosition(0);
    }
  }

  return {
    playlists,
    selectedPlaylist,
    selectedPlaylistId,
    playlistTracks,
    currentTrack,
    currentTrackId,
    isPlaying,
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
  };
}

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { PlaylistId, Track, TrackId } from "@shared/types";
import { getPlaybackManager } from "@/services/playback-manager";
import { useLibrary } from "./use-library";
import { usePlaylists } from "./use-playlists";

/**
 * Adapts the PlaybackManager (the single source of playback truth, PRD
 * §10.4 — including shuffle, repeat, and volume) plus the library and
 * playlist stores into React state for the main window. A selectedPlaylistId
 * of null means the Library view (all tracks).
 */
export function usePlayer() {
  const library = useLibrary();
  const playlistStore = usePlaylists();
  const { tracks } = library;
  const { playlists } = playlistStore;
  const manager = getPlaybackManager();
  const playback = useSyncExternalStore(manager.subscribe, manager.getState);
  const [selectedPlaylistId, setSelectedPlaylistId] =
    useState<PlaylistId | null>(null);

  const trackMap = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );

  // Library changes reach the engine here: removing the playing track stops
  // audio for real; removed tracks leave the queue.
  useEffect(() => {
    manager.syncWithLibrary(new Set(trackMap.keys()));
  }, [manager, trackMap]);

  // A selection pointing at a deleted playlist resolves to null, which reads
  // as the Library view — the natural fallback.
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

  // Resolve display data through the library so metadata edits show live;
  // the manager's copy is the fallback during the removal round-trip.
  const currentTrack = playback.track
    ? (trackMap.get(playback.track.id) ?? playback.track)
    : null;

  /** Starts a track in the context the user clicked: the visible list
   * becomes the queue. Missing files are excluded up front, so next,
   * previous, and auto-advance never land on them (PRD §31). */
  function playTrack(trackId: TrackId) {
    const playable = playlistTracks.filter((track) => !track.unavailable);
    const index = playable.findIndex((track) => track.id === trackId);
    if (index !== -1) manager.playQueue(playable, index);
  }

  function togglePlay() {
    if (playback.track) {
      manager.toggle();
      return;
    }
    const firstPlayable = playlistTracks.find((track) => !track.unavailable);
    if (firstPlayable) playTrack(firstPlayable.id);
  }

  function cycleRepeat() {
    const mode = playback.repeat;
    manager.setRepeat(mode === "off" ? "all" : mode === "all" ? "one" : "off");
  }

  function addPlaylist(name: string) {
    void playlistStore.create(name).then((playlist) => {
      if (playlist) setSelectedPlaylistId(playlist.id); // select it (PRD §52)
    });
  }

  function deletePlaylist(playlistId: PlaylistId) {
    playlistStore.remove(playlistId);
    if (playlistId === selectedPlaylistId) {
      setSelectedPlaylistId(null); // fall back to the Library view
    }
  }

  function removeTrackFromLibrary(trackId: TrackId) {
    // The main process owns both stores and cleans playlist references
    // itself; the syncWithLibrary effect stops audio if needed.
    library.removeTrack(trackId);
  }

  return {
    playlists,
    selectedPlaylist,
    selectedPlaylistId,
    playlistTracks,
    libraryTrackCount: tracks.length,
    currentTrack,
    currentTrackId: currentTrack?.id ?? null,
    isPlaying: playback.isPlaying,
    position: playback.position,
    duration: playback.duration,
    playbackError: playback.error,
    volume: playback.volume,
    muted: playback.muted,
    shuffle: playback.shuffle,
    repeat: playback.repeat,
    selectPlaylist: setSelectedPlaylistId,
    playTrack,
    togglePlay,
    next: () => manager.next(),
    previous: () => manager.previous(),
    seek: (position: number) => manager.seek(position),
    setVolume: (volume: number) => manager.setVolume(volume),
    toggleMute: () => manager.toggleMute(),
    toggleShuffle: () => manager.toggleShuffle(),
    cycleRepeat,
    addPlaylist,
    renamePlaylist: playlistStore.rename,
    deletePlaylist,
    addTrackToPlaylist: playlistStore.addTrack,
    removeTrackFromPlaylist: playlistStore.removeTrack,
    removeTrackFromLibrary,
    addFilesToLibrary: library.addTracks,
  };
}

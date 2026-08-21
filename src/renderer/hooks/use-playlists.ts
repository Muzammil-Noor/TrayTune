import { useCallback, useEffect, useRef, useState } from "react";
import type { Playlist, PlaylistId, TrackId } from "@shared/types";

/**
 * The renderer's view of the persisted playlists. Mirrors useLibrary: the
 * main process owns the data (PRD §63); pull once on mount, then stay in
 * sync through the playlists:changed broadcast.
 */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // Once a broadcast lands, a stale initial getAll response must not win.
  const receivedBroadcast = useRef(false);

  useEffect(() => {
    let disposed = false;
    window.traytune?.playlists
      .getAll()
      .then((initial) => {
        if (!disposed && !receivedBroadcast.current) setPlaylists(initial);
      })
      .catch(() => {
        /* playlists:changed pushes will fill in */
      });
    const unsubscribe = window.traytune?.playlists.onChanged((next) => {
      receivedBroadcast.current = true;
      setPlaylists(next);
    });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  /** Returns the created playlist so callers can select it (PRD §52). */
  const create = useCallback(async (name: string): Promise<Playlist | null> => {
    return (await window.traytune?.playlists.create(name)) ?? null;
  }, []);

  const rename = useCallback((playlistId: PlaylistId, name: string) => {
    void window.traytune?.playlists.rename(playlistId, name);
  }, []);

  const remove = useCallback((playlistId: PlaylistId) => {
    void window.traytune?.playlists.remove(playlistId);
  }, []);

  const addTrack = useCallback((playlistId: PlaylistId, trackId: TrackId) => {
    void window.traytune?.playlists.addTrack(playlistId, trackId);
  }, []);

  const removeTrack = useCallback(
    (playlistId: PlaylistId, trackId: TrackId) => {
      void window.traytune?.playlists.removeTrack(playlistId, trackId);
    },
    [],
  );

  const reorder = useCallback(
    (playlistId: PlaylistId, fromIndex: number, toIndex: number) => {
      void window.traytune?.playlists.reorder(playlistId, fromIndex, toIndex);
    },
    [],
  );

  /** Returns the merged playlist so callers can select it. */
  const merge = useCallback(
    async (
      firstId: PlaylistId,
      secondId: PlaylistId,
      name: string,
    ): Promise<Playlist | null> => {
      return (
        (await window.traytune?.playlists.merge(firstId, secondId, name)) ??
        null
      );
    },
    [],
  );

  return {
    playlists,
    create,
    rename,
    remove,
    addTrack,
    removeTrack,
    reorder,
    merge,
  };
}

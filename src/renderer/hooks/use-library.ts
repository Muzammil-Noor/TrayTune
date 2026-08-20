import { useCallback, useEffect, useRef, useState } from "react";
import type { AddTracksResult, Track, TrackId } from "@shared/types";

/**
 * The renderer's view of the real music library. The main process owns the
 * data (PRD §63); this hook pulls it on mount and stays in sync through the
 * library:changed broadcast, which fires in every window after any mutation.
 */
export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  // Once a broadcast lands, a stale initial getTracks response must not win.
  const receivedBroadcast = useRef(false);

  useEffect(() => {
    let disposed = false;
    window.traytune?.library
      .getTracks()
      .then((initial) => {
        if (!disposed && !receivedBroadcast.current) setTracks(initial);
      })
      .catch(() => {
        /* library:changed pushes will fill in */
      });
    const unsubscribe = window.traytune?.library.onChanged((next) => {
      receivedBroadcast.current = true;
      setTracks(next);
    });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  /** Opens the file picker and imports the selection. State updates arrive
   * via the broadcast; the result is returned for UI feedback. */
  const addTracks = useCallback(async (): Promise<AddTracksResult | null> => {
    return (await window.traytune?.library.addTracks()) ?? null;
  }, []);

  const removeTrack = useCallback((trackId: TrackId) => {
    void window.traytune?.library.removeTrack(trackId);
  }, []);

  return { tracks, addTracks, removeTrack };
}

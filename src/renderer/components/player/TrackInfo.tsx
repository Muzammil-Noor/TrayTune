import type { Track } from "@shared/types";
import { Icon } from "@/components/ui/Icon";
import { glyphs } from "@/lib/glyphs";

interface TrackInfoProps {
  track: Track | null;
}

/** Current track title/artist/album with an artwork placeholder (task 1.10).
 * Real artwork arrives with metadata extraction in Phase 3. */
export function TrackInfo({ track }: TrackInfoProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-neutral-200">
        <Icon glyph={glyphs.musicAlbum} className="text-lg text-neutral-500" />
      </div>
      {track ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{track.title}</p>
          <p className="truncate text-xs text-neutral-500">
            {track.artist ?? "Unknown artist"}
            {track.album ? ` · ${track.album}` : ""}
          </p>
        </div>
      ) : (
        <p className="truncate text-sm text-neutral-400">Nothing playing</p>
      )}
    </div>
  );
}

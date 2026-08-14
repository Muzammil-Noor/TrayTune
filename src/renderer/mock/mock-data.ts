import type { Playlist, Track } from "@shared/types";

/**
 * Mock library used while the UI is built (Phase 1). Replaced by the real
 * local library in Phase 3.
 */

const T = 1755000000000; // static "imported at" timestamp for mock records

function track(
  id: string,
  title: string,
  artist: string,
  album: string,
  duration: number,
  year?: number,
): Track {
  return {
    id,
    title,
    artist,
    album,
    duration,
    year,
    filePath: `C:\\Music\\${artist}\\${album}\\${title}.mp3`,
    createdAt: T,
  };
}

export const mockTracks: Track[] = [
  track("track-001", "Midnight Drive", "Neon Coast", "City Lights", 222, 2021),
  track("track-002", "Paper Planes Over Us", "Willow & Finch", "Field Notes", 198, 2019),
  track("track-003", "Static Bloom", "Velvet Arcade", "Afterglow", 245, 2022),
  track("track-004", "Northern Line", "The Gray Harbors", "Terminals", 261),
  track("track-005", "Sugar Rush", "Peach Metric", "Pop Standards", 183, 2023),
  track("track-006", "Long Way Home", "Ada Lane", "Postcards", 274, 2018),
  track("track-007", "Cobalt Sky", "Drift Theory", "Weather Systems", 240),
  track("track-008", "Two Steps Back", "The Late Shift", "Night Work", 205, 2020),
  track("track-009", "Glass Garden", "Mira Vale", "Botanica", 233, 2022),
  track("track-010", "Runaway Signal", "Analog Youth", "Broadcasts", 218),
  track("track-011", "Slow Motion Sunday", "Café Orbit", "Weekends", 289, 2017),
  track("track-012", "Ember & Ash", "Hollow Pines", "Timberline", 251),
  track("track-013", "Satellites", "Luma", "Orbit", 201, 2024),
  track("track-014", "Overtime", "The Late Shift", "Night Work", 194, 2020),
  track("track-015", "Coastline", "Neon Coast", "City Lights", 236, 2021),
  track("track-016", "First Light", "Ada Lane", "Postcards", 210, 2018),
  track("track-017", "Gravity Well", "Drift Theory", "Weather Systems", 266),
  track("track-018", "Golden Hour", "Willow & Finch", "Field Notes", 227, 2019),
];

export const mockPlaylists: Playlist[] = [
  {
    id: "playlist-001",
    name: "Favorites",
    trackIds: ["track-001", "track-003", "track-006", "track-009", "track-013", "track-018"],
    createdAt: T,
    updatedAt: T,
  },
  {
    id: "playlist-002",
    name: "Workout",
    trackIds: ["track-005", "track-008", "track-010", "track-014", "track-017"],
    createdAt: T,
    updatedAt: T,
  },
  {
    id: "playlist-003",
    name: "Chill",
    trackIds: ["track-002", "track-011", "track-012", "track-016"],
    createdAt: T,
    updatedAt: T,
  },
  {
    id: "playlist-004",
    name: "Downloads",
    trackIds: ["track-004", "track-007", "track-015"],
    createdAt: T,
    updatedAt: T,
  },
];

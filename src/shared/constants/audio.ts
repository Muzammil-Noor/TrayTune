/**
 * File extensions offered by the import picker and accepted from renderer-
 * supplied paths (future drag-and-drop). Everything here is decodable by
 * Chromium's audio stack, so imported files are playable in Phase 4.
 */
export const SUPPORTED_AUDIO_EXTENSIONS = [
  "mp3",
  "m4a",
  "aac",
  "flac",
  "wav",
  "ogg",
  "opus",
  "webm",
] as const;

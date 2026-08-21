import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { extname } from "path";
import { Readable } from "stream";
import { protocol } from "electron";
import { getTrackFilePath } from "./services/library";

/**
 * Serves library audio to the renderer. The sandboxed renderer cannot read
 * files (and must not — PRD §26); instead the audio element loads
 * `traytune-audio://track/<trackId>` and this handler streams the matching
 * library file. Only ids present in the library resolve, so the renderer can
 * never address arbitrary paths (PRD §49).
 *
 * Range requests are implemented by hand: Chromium's media stack needs 206
 * responses to seek (net.fetch on file: URLs always answers 200-full-body,
 * which silently snaps every out-of-buffer seek back to zero).
 */

export const AUDIO_SCHEME = "traytune-audio";

/** Must run before app.whenReady — schemes cannot be privileged later.
 * `stream: true` lets the media element treat responses as seekable media. */
export function registerAudioScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: AUDIO_SCHEME, privileges: { stream: true } },
  ]);
}

function contentType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".flac":
      return "audio/flac";
    case ".wav":
      return "audio/wav";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    case ".webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}

function fileStream(
  filePath: string,
  range?: { start: number; end: number },
): ReadableStream<Uint8Array> {
  // Node's web-stream type and the DOM lib type disagree — same object.
  return Readable.toWeb(
    createReadStream(filePath, range),
  ) as ReadableStream<Uint8Array>;
}

export function registerAudioProtocolHandler(): void {
  protocol.handle(AUDIO_SCHEME, async (request) => {
    let trackId: string | null = null;
    try {
      const url = new URL(request.url);
      if (url.host === "track") {
        trackId = decodeURIComponent(url.pathname.replace(/^\//, ""));
      }
    } catch {
      // Malformed URL — falls through to 404.
    }
    const filePath = trackId ? getTrackFilePath(trackId) : null;
    if (!filePath) {
      return new Response("Not found", { status: 404 });
    }

    let size: number;
    try {
      size = (await stat(filePath)).size;
    } catch {
      // The file vanished since the last availability scan (PRD §31) — a 404
      // surfaces as a non-fatal media error in the renderer.
      return new Response("Not found", { status: 404 });
    }

    const headers: Record<string, string> = {
      "Accept-Ranges": "bytes",
      "Content-Type": contentType(filePath),
    };

    const match = /^bytes=(\d+)-(\d*)$/.exec(
      request.headers.get("range") ?? "",
    );
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      headers["Content-Length"] = String(end - start + 1);
      return new Response(fileStream(filePath, { start, end }), {
        status: 206,
        headers,
      });
    }

    headers["Content-Length"] = String(size);
    return new Response(fileStream(filePath), { status: 200, headers });
  });
}

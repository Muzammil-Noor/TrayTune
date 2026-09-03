import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { extname } from "path";
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

/**
 * Must run before app.whenReady — schemes cannot be privileged later.
 *
 * `stream: true` lets the media element treat responses as seekable media.
 * `standard: true` is what makes range requests actually work: without it
 * Chromium treats the scheme as opaque and refuses partial content on it,
 * cancelling every request it makes at a non-zero offset before reading a
 * byte. The element then fails with PIPELINE_ERROR_READ, which the playback
 * manager reads as an unplayable track — so seeking past the buffered range
 * used to skip to the next song instead of seeking. Both flags are required;
 * a correct 206 from this handler is not enough on its own.
 *
 * Deliberately no `supportFetchAPI`: the renderer should be able to play
 * these URLs, not read raw file bytes out of them.
 */
export function registerAudioScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: AUDIO_SCHEME, privileges: { standard: true, stream: true } },
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

/**
 * Body for one response. Built by hand rather than with Readable.toWeb so
 * that cancellation stays silent — every seek cancels the response in flight,
 * and the web-stream adapter destroys the fs stream with the cancel reason,
 * turning routine cancellation into an AbortError on a stream nothing is
 * listening to.
 */
function fileStream(
  filePath: string,
  range: { start: number; end: number },
): ReadableStream<Uint8Array> {
  const file = createReadStream(filePath, range);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      file.on("data", (chunk) => {
        controller.enqueue(chunk as Uint8Array);
        // Respect the consumer's backpressure: media buffers ahead, then
        // stops reading until playback catches up.
        if ((controller.desiredSize ?? 1) <= 0) file.pause();
      });
      file.on("end", () => controller.close());
      file.on("error", (error) => controller.error(error));
    },
    pull() {
      file.resume();
    },
    cancel() {
      file.on("error", () => {}); // teardown races are not failures
      file.destroy();
    },
  });
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
      // The response has to run to the end of the requested range: Chromium
      // takes an early finish as end-of-file and shortens the track to what
      // it received.
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      headers["Content-Length"] = String(end - start + 1);
      return new Response(fileStream(filePath, { start, end }), {
        status: 206,
        headers,
      });
    }

    headers["Content-Length"] = String(size);
    return new Response(fileStream(filePath, { start: 0, end: size - 1 }), {
      status: 200,
      headers,
    });
  });
}

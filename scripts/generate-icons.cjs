/**
 * Generates TrayTune's Windows icons and writes them to resources/.
 *
 *   npx electron scripts/generate-icons.cjs
 *
 * The glyph is rendered with the real "Segoe Fluent Icons" system font through
 * Chromium's canvas, so the tray icon looks like the shell's own glyphs rather
 * than a pasted-in picture. Output is committed, so this only needs to be
 * re-run when the glyph or the colors below change.
 *
 * Produces:
 *   tray-light.ico  monochrome glyph for LIGHT taskbars (black ink)
 *   tray-dark.ico   monochrome glyph for DARK taskbars (white ink)
 *   icon.ico        app/taskbar icon: colored tile + white glyph, so it reads
 *                   on both light and dark taskbars
 *   icon.png        512px version of the app icon
 */
const { app, BrowserWindow } = require("electron");
const { writeFileSync } = require("fs");
const { join } = require("path");

/** Segoe Fluent Icons "MusicNote". */
const GLYPH = "\uEC4F";

/** App-icon tile gradient. */
const TILE_FROM = "#4F46E5";
const TILE_TO = "#9333EA";

// Windows picks 16px at 100% DPI, 20 at 125%, 24 at 150%, 32 at 200%.
const TRAY_SIZES = [16, 20, 24, 32, 40, 48, 64];
const APP_SIZES = [16, 24, 32, 48, 64, 128, 256];

const OUT_DIR = join(__dirname, "..", "resources");

/** Assembles PNG buffers into a Windows .ico (PNG-compressed entries). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  for (const [index, image] of images.entries()) {
    const entry = index * 16;
    // 256 is stored as 0 in the single-byte size fields.
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry);
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 1);
    directory.writeUInt8(0, entry + 2); // palette size
    directory.writeUInt8(0, entry + 3); // reserved
    directory.writeUInt16LE(1, entry + 4); // color planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(image.buffer.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.buffer.length;
  }

  return Buffer.concat([
    header,
    directory,
    ...images.map((image) => image.buffer),
  ]);
}

function pngFromDataUrl(dataUrl) {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

/** Runs in the page: draws every icon and returns them as data URLs. */
function pageScript(glyph, traySizes, appSizes, tileFrom, tileTo) {
  return `(async () => {
    const GLYPH = ${JSON.stringify(glyph)};
    const FONT = '"Segoe Fluent Icons", "Segoe MDL2 Assets"';
    await document.fonts.ready;

    /** Scales the glyph so its ink box fills \`fill\` of the canvas, then
     * centers that ink box exactly — glyph metrics vary per icon, so
     * centering on the em box would look off. */
    function drawGlyph(ctx, size, color, fill) {
      const REFERENCE = 200;
      ctx.font = REFERENCE + 'px ' + FONT;
      const probe = ctx.measureText(GLYPH);
      const inkWidth = probe.actualBoundingBoxLeft + probe.actualBoundingBoxRight;
      const inkHeight = probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent;
      const scale = (size * fill) / Math.max(inkWidth, inkHeight);

      ctx.font = Math.max(1, REFERENCE * scale) + 'px ' + FONT;
      const metrics = ctx.measureText(GLYPH);
      const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(
        GLYPH,
        (size - width) / 2 + metrics.actualBoundingBoxLeft,
        (size - height) / 2 + metrics.actualBoundingBoxAscent,
      );
    }

    function canvasOf(size) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      return canvas;
    }

    function trayIcon(size, color) {
      const canvas = canvasOf(size);
      drawGlyph(canvas.getContext('2d'), size, color, 0.86);
      return canvas.toDataURL('image/png');
    }

    function appIcon(size) {
      const canvas = canvasOf(size);
      const ctx = canvas.getContext('2d');
      const inset = Math.max(0, Math.round(size * 0.04));
      const box = size - inset * 2;
      const radius = box * 0.235; // Win11-ish squircle corner

      const gradient = ctx.createLinearGradient(inset, inset, size - inset, size - inset);
      gradient.addColorStop(0, ${JSON.stringify(tileFrom)});
      gradient.addColorStop(1, ${JSON.stringify(tileTo)});
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(inset, inset, box, box, radius);
      ctx.fill();

      // The glyph is drawn on its own canvas so it can be centered inside the
      // tile independently of the inset.
      const glyphCanvas = canvasOf(size);
      drawGlyph(glyphCanvas.getContext('2d'), size, '#ffffff', 0.5);
      ctx.drawImage(glyphCanvas, 0, 0);
      return canvas.toDataURL('image/png');
    }

    return {
      trayLight: ${JSON.stringify(traySizes)}.map((size) => [size, trayIcon(size, '#000000')]),
      trayDark: ${JSON.stringify(traySizes)}.map((size) => [size, trayIcon(size, '#ffffff')]),
      app: ${JSON.stringify(appSizes)}.map((size) => [size, appIcon(size)]),
      appLarge: appIcon(512),
      fontApplied: (() => {
        const ctx = canvasOf(16).getContext('2d');
        ctx.font = '16px ' + FONT;
        // A missing icon font renders .notdef/fallback; ink width of 0 means
        // nothing was drawn at all.
        const m = ctx.measureText(GLYPH);
        return m.actualBoundingBoxRight + m.actualBoundingBoxLeft > 0;
      })(),
    };
  })()`;
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 600, height: 400 });
  await window.loadURL("about:blank");

  const result = await window.webContents.executeJavaScript(
    pageScript(GLYPH, TRAY_SIZES, APP_SIZES, TILE_FROM, TILE_TO),
  );

  if (!result.fontApplied) {
    console.error("[icons] the icon font produced no glyph — aborting");
    app.exit(1);
    return;
  }

  const toImages = (pairs) =>
    pairs.map(([size, dataUrl]) => ({ size, buffer: pngFromDataUrl(dataUrl) }));

  const outputs = [
    ["tray-light.ico", buildIco(toImages(result.trayLight))],
    ["tray-dark.ico", buildIco(toImages(result.trayDark))],
    ["icon.ico", buildIco(toImages(result.app))],
    ["icon.png", pngFromDataUrl(result.appLarge)],
  ];

  for (const [name, buffer] of outputs) {
    writeFileSync(join(OUT_DIR, name), buffer);
    console.log(`[icons] wrote ${name} (${(buffer.length / 1024).toFixed(1)} kB)`);
  }

  app.exit(0);
});

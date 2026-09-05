# TrayTune

A local-first, Windows 11-style music player that lives in the system tray.

Left-click the tray icon for a mini player that slides up above the taskbar; right-click for
transport controls. Open the main window when you want to manage the library. Nothing about
your music or your library ever leaves the machine.

Built with Electron, Vite, React, TypeScript and Tailwind CSS.

## Features

**Tray**

- Left-click opens a frameless mini player above the tray; right-click opens a menu with the
  current track, Play/Pause, Previous, Next, Open TrayTune and Exit.
- Closing the window hides to the tray (configurable) while playback continues.

**Library**

- Import audio files through the picker.
- Each track gets a stable id at import. Importing the same file twice is skipped.
- Files that disappear from disk are flagged as unavailable and are skipped by next/previous and auto-advance.
- Supported formats: MP3, M4A, AAC, FLAC, WAV, OGG, Opus, WebM.

**Playlists**

- Create, rename, delete and reorder tracks within a playlist and merge two playlists.
- Playlists reference tracks by id.
- Removing a track from a playlist keeps it in the library.

**Playback**

- Play/pause, stop, seek (while playing or paused), previous/next and auto-advance.
- Shuffle (non-destructive: it rewrites the play order, never the playlist) and repeat off/all/one.
- Volume and mute, persisted across restarts.
- The playback queue is a snapshot of the list you started from so browsing elsewhere never hijacks next/previous.
- A file that cannot be played is a non-fatal error such that it is reported and skipped.

## Getting started

Requires Node.js 24 (the version CI builds with) and Windows.

```bash
npm install
npm run dev
```

### Scripts

| Script                | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `npm run dev`         | Run the app with hot reload (electron-vite)                          |
| `npm run build`       | Type-check (`tsc -b`) and build into `out/`                          |
| `npm start`           | Preview the production build                                         |
| `npm run lint`        | ESLint over the whole project                                        |
| `npm run package:win` | Build, then produce an NSIS installer and a portable .exe in `dist/` |

Icons are generated via scripts `node scripts/generate-icons.cjs` re-renders
`resources/` (app icon plus the light and dark tray icons) from a Segoe Fluent glyph.

## Architecture

**Process split.** The main process owns everything privileged such as the filesystem, the tray and the
windows. The renderer owns the UI. They talk only over explicit, individually named and
validated IPC channels exposed through a preload `contextBridge`. There is no generic
"invoke anything" channel. `contextIsolation` is on, `nodeIntegration` is off and the renderer
is sandboxed so that the UI never touches a file path directly.

**Two windows, one bundle.** The main window and the flyout load the same renderer bundle. The
flyout adds a `#flyout` hash and mounts `FlyoutApp` instead of `App`.

**One playback engine.** `PlaybackManager` (`src/renderer/services/playback-manager.ts`) is a
plain class, not a React component and it is the single source of truth for transport, queue,
shuffle, repeat and volume. It lives in the main window's renderer and that window stays alive in
the tray so audio survives. React adapts to it through `useSyncExternalStore`. The
tray and the flyout send *actions* to it and render the *snapshots* it publishes and hold no
playback state of their own.

**Audio streaming.** The sandboxed renderer cannot read files, so the audip element loads
`traytune-audio://track/<id>` and the main process streams the matching file. Only ids present
in the library resolve, which is what makes the renderer unable to address arbitrary paths.
The scheme is registered with `{ standard: true, stream: true }` and the handler implements
HTTP Range by hand, which makes seeking work.

**Storage.** `library.json`, `playlists.json` and `settings.json` in the Electron user-data
directory (`%APPDATA%\TrayTune`). Writes go to a temporary file and are renamed into place so
an interrupted write cannot corrupt the store. A file that fails to parse is set aside as
`.corrupt` rather than discarded.
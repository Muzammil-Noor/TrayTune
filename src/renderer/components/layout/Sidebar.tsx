export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col">
      <header className="px-5 pb-2 pt-5">
        <h1 className="text-base font-semibold">TrayTune</h1>
      </header>

      <p className="px-5 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Playlists
      </p>

      {/* Playlist list — built in task 1.8 */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <p className="px-3 py-2 text-sm text-neutral-400">No playlists yet.</p>
      </nav>

      <footer className="p-3">
        {/* Wired up with playlist creation in later phases */}
        <button
          type="button"
          className="w-full rounded-md border border-black/8 bg-white px-3 py-1.5 text-left text-sm shadow-xs transition-colors hover:bg-neutral-50 active:bg-neutral-100"
        >
          + Add Playlist
        </button>
      </footer>
    </aside>
  );
}

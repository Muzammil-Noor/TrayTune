import { useState } from "react";
import type { FormEvent } from "react";
import type { Playlist, PlaylistId } from "@shared/types";
import { Button } from "@/components/ui/Button";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { TextInput } from "@/components/ui/TextInput";
import { glyphs } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

interface SidebarProps {
  playlists: Playlist[];
  selectedPlaylistId: PlaylistId | null;
  onSelect: (playlistId: PlaylistId) => void;
  onAdd: (name: string) => void;
  onRename: (playlistId: PlaylistId, name: string) => void;
  onDelete: (playlistId: PlaylistId) => void;
}

type MenuState = { x: number; y: number; playlist: Playlist } | null;
type DialogState =
  | { mode: "add" }
  | { mode: "rename"; playlist: Playlist }
  | { mode: "delete"; playlist: Playlist }
  | null;

export function Sidebar({
  playlists,
  selectedPlaylistId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: SidebarProps) {
  const [menu, setMenu] = useState<MenuState>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameInput, setNameInput] = useState("");

  function openDialog(state: NonNullable<DialogState>) {
    setNameInput(state.mode === "rename" ? state.playlist.name : "");
    setDialog(state);
  }

  function submitNameDialog(event: FormEvent) {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name || !dialog) return;
    if (dialog.mode === "add") onAdd(name);
    if (dialog.mode === "rename") onRename(dialog.playlist.id, name);
    setDialog(null);
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col">
      <header className="px-5 pb-2 pt-5">
        <h1 className="text-base font-semibold">TrayTune</h1>
      </header>

      <p className="px-5 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Playlists
      </p>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {playlists.length === 0 && (
          <p className="px-3 py-2 text-sm text-neutral-400">
            No playlists yet.
          </p>
        )}
        {playlists.map((playlist) => {
          const selected = playlist.id === selectedPlaylistId;
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => onSelect(playlist.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setMenu({ x: event.clientX, y: event.clientY, playlist });
              }}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-900/75",
                selected
                  ? "bg-black/5 font-medium"
                  : "hover:bg-black/5 active:bg-black/10",
              )}
            >
              {/* Win11 NavigationView selection pill */}
              {selected && (
                <span className="absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Icon
                glyph={glyphs.bulletedList}
                className="text-sm text-neutral-600"
              />
              <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
              <span className="text-xs tabular-nums text-neutral-500">
                {playlist.trackIds.length}
              </span>
            </button>
          );
        })}
      </nav>

      <footer className="p-3">
        <Button
          variant="subtle"
          className="w-full justify-start"
          onClick={() => openDialog({ mode: "add" })}
        >
          <Icon glyph={glyphs.add} className="text-sm" />
          Add Playlist
        </Button>
      </footer>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Rename",
              glyph: glyphs.rename,
              onSelect: () =>
                openDialog({ mode: "rename", playlist: menu.playlist }),
            },
            { type: "separator" },
            {
              label: "Delete",
              glyph: glyphs.delete,
              danger: true,
              onSelect: () =>
                openDialog({ mode: "delete", playlist: menu.playlist }),
            },
          ]}
        />
      )}

      <Dialog
        open={dialog?.mode === "add" || dialog?.mode === "rename"}
        title={dialog?.mode === "rename" ? "Rename playlist" : "New playlist"}
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button
              variant="accent"
              disabled={nameInput.trim().length === 0}
              form="playlist-name-form"
              type="submit"
            >
              {dialog?.mode === "rename" ? "Rename" : "Create"}
            </Button>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
          </>
        }
      >
        <form id="playlist-name-form" onSubmit={submitNameDialog}>
          <TextInput
            autoFocus
            value={nameInput}
            placeholder="Playlist name"
            aria-label="Playlist name"
            onChange={(event) => setNameInput(event.currentTarget.value)}
          />
        </form>
      </Dialog>

      <Dialog
        open={dialog?.mode === "delete"}
        title="Delete playlist"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => {
                if (dialog?.mode === "delete") onDelete(dialog.playlist.id);
                setDialog(null);
              }}
            >
              Delete
            </Button>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          “{dialog?.mode === "delete" ? dialog.playlist.name : ""}” will be
          deleted permanently. Tracks stay in your library.
        </p>
      </Dialog>
    </aside>
  );
}

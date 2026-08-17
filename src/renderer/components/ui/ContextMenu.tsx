import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export type ContextMenuItem =
  | {
      type?: "item";
      label: string;
      glyph?: string;
      danger?: boolean;
      onSelect: () => void;
    }
  | { type: "separator" };

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Win11-style flyout menu opened at pointer position (clamped to the
 * viewport). The invisible backdrop closes it on any outside interaction. */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    setPosition({
      x: Math.max(4, Math.min(x, window.innerWidth - rect.width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - rect.height - 4)),
    });
  }, [x, y]);

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        ref={menuRef}
        role="menu"
        className="animate-in fade-in zoom-in-95 fixed min-w-48 rounded-lg border border-stroke-strong bg-popup py-1 shadow-lg duration-100"
        style={{ left: position.x, top: position.y }}
      >
        {items.map((item, index) =>
          item.type === "separator" ? (
            <div key={index} className="mx-2 my-1 h-px bg-stroke-strong" />
          ) : (
            <button
              key={index}
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm outline-none transition-colors hover:bg-subtle focus-visible:bg-subtle active:bg-subtle-strong",
                item.danger && "text-danger",
              )}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
            >
              {item.glyph && (
                <Icon glyph={item.glyph} className="text-sm text-current" />
              )}
              <span className={cn(!item.glyph && "pl-7")}>{item.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

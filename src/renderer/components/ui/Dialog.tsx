import { useEffect, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Action buttons, rendered right-aligned in the Win11 footer strip. */
  footer?: ReactNode;
  onClose: () => void;
}

/** Win11-style content dialog: dimmed backdrop, white body, gray footer strip.
 * Closes on Escape or backdrop click. */
export function Dialog({ open, title, children, footer, onClose }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/30 duration-150"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-in fade-in zoom-in-95 w-95 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl duration-150"
      >
        <div className="p-5">
          <h2 className="pb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-black/5 bg-[#f6f6f6] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

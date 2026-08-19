import type { ReactNode } from "react";

interface SettingRowProps {
  title: string;
  description: string;
  /** The control, rendered right-aligned (toggle, dropdown, swatch, …). */
  children?: ReactNode;
}

/** Win11 Settings-style card: title + description left, control right. */
export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-md border border-stroke bg-surface-secondary px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm">{title}</p>
        <p className="pt-0.5 text-xs text-secondary">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

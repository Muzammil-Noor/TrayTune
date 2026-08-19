import type { SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { glyphs } from "@/lib/glyphs";
import { cn } from "@/lib/utils";

/** Win11-style dropdown built on a native select (keyboard and screen-reader
 * behavior for free; the popup follows the theme via color-scheme). */
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-8 w-full cursor-default appearance-none rounded-md border border-stroke-strong bg-control pl-3 pr-8 text-sm text-primary shadow-xs outline-none transition-colors hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-40"
        {...props}
      >
        {children}
      </select>
      <Icon
        glyph={glyphs.chevronDown}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-secondary"
      />
    </div>
  );
}

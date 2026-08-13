import { cn } from "@/lib/utils";

interface IconProps {
  glyph: string;
  className?: string;
}

/** Renders a Segoe Fluent Icons glyph (see lib/glyphs.ts). Decorative only —
 * pair with a text label or aria-label on the interactive parent. */
export function Icon({ glyph, className }: IconProps) {
  return (
    <span aria-hidden="true" className={cn("fluent-icon", className)}>
      {glyph}
    </span>
  );
}

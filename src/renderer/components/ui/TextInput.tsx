import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Win11-style text field: subtle border with an accent underline on focus. */
export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full cursor-text select-text rounded-md border border-black/10 border-b-neutral-400 bg-white px-3 text-sm text-neutral-900 outline-none transition-shadow placeholder:text-neutral-400 focus:shadow-[inset_0_-2px_0_0_var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
}

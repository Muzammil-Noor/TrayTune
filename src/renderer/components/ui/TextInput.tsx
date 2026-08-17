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
        "h-8 w-full cursor-text select-text rounded-md border border-stroke-strong border-b-tertiary bg-control px-3 text-sm text-primary outline-none transition-shadow placeholder:text-tertiary focus:shadow-[inset_0_-2px_0_0_var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

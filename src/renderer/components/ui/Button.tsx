import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900/75 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        standard:
          "border border-black/10 bg-white shadow-xs hover:bg-neutral-50 active:bg-neutral-100 active:text-neutral-600",
        accent:
          "bg-accent text-white shadow-xs hover:bg-accent/90 active:bg-accent/80",
        subtle: "text-neutral-800 hover:bg-black/5 active:bg-black/10",
        danger:
          "bg-[#c42b1c] text-white shadow-xs hover:bg-[#c42b1c]/90 active:bg-[#c42b1c]/80",
      },
      size: {
        md: "h-8 px-3",
        sm: "h-7 px-2 text-[13px]",
        icon: "size-8",
        iconLg: "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "standard",
      size: "md",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

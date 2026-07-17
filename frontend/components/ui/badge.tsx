import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/80",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800/80",
        destructive:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
        info:
          "border-transparent bg-blue-100 text-blue-850 dark:bg-blue-950/30 dark:text-blue-400",
        outline: "text-zinc-950 dark:text-zinc-50 border-zinc-200 dark:border-zinc-850",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

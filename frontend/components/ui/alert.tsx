import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-zinc-950 dark:[&>svg]:text-zinc-50",
  {
    variants: {
      variant: {
        default: "bg-white text-zinc-950 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:border-zinc-800",
        destructive:
          "border-red-500/50 text-red-650 dark:border-red-900/50 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
        success:
          "border-emerald-500/50 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        warning:
          "border-amber-500/50 text-amber-800 dark:border-amber-900/50 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        info:
          "border-blue-500/50 text-blue-800 dark:border-blue-900/50 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight text-sm", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

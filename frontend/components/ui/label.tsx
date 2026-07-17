import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-xs font-semibold uppercase tracking-wider text-zinc-500 select-none mb-1.5 block dark:text-zinc-400",
          className
        )}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";

export { Label };

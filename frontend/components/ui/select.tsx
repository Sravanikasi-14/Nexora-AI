import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-sm shadow-sm transition-all duration-250 appearance-none pr-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 focus-visible:dark:ring-zinc-300",
            error && "border-red-500 dark:border-red-900 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-zinc-500 dark:text-zinc-400">
          <ChevronDown size={14} className="opacity-60" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };

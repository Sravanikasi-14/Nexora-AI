import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 p-8 text-center animate-fade-in dark:border-zinc-800",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-500 border border-zinc-150 mb-4 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-1.5 text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed dark:text-zinc-400">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} className="mt-4" size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
}

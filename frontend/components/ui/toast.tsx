import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastProps {
  message: string | null;
  type?: "success" | "error" | "info" | "warning";
  onClose?: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />,
    info: <Info className="h-4.5 w-4.5 text-blue-500 shrink-0" />,
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-premium dark:border-zinc-800 dark:bg-zinc-950 max-w-sm"
        >
          {icons[type]}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
              {message}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
              title="Close"
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

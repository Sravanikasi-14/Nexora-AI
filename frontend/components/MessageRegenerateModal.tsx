"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface MessageRegenerateModalProps {
  onClose: () => void;
  onSubmit: (style: string) => void;
  isPending: boolean;
}

export default function MessageRegenerateModal({ onClose, onSubmit, isPending }: MessageRegenerateModalProps) {
  const [style, setStyle] = React.useState("Friendlier");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(style);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="w-full max-w-sm p-6 relative border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
        <button
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-55 transition-colors"
          onClick={onClose}
          title="Close Dialog"
        >
          <X size={18} />
        </button>
        <h2 className="font-display text-sm font-semibold mb-4 text-left">Regenerate outreach draft</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <Label>Choose rewriting tone style</Label>
            <Select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              <option value="Friendlier">😊 Friendlier (Warm & Conversational)</option>
              <option value="More Professional">💼 More Professional (Formal & Polite)</option>
              <option value="Shorter">⚡ Shorter (Concise & Direct)</option>
              <option value="More Persuasive">🔥 More Persuasive (Stronger Call-To-Action)</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-150 dark:border-zinc-850 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              Regenerate Message
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

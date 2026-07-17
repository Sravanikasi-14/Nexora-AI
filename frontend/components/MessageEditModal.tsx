"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MessageEditModalProps {
  onClose: () => void;
  onSubmit: (content: string) => void;
  initialContent: string;
}

export default function MessageEditModal({ onClose, onSubmit, initialContent }: MessageEditModalProps) {
  const [content, setContent] = React.useState(initialContent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="w-full max-w-lg p-6 relative border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
        <button
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-55 transition-colors"
          onClick={onClose}
          title="Close Dialog"
        >
          <X size={18} />
        </button>
        <h2 className="font-display text-sm font-semibold mb-4 text-left">Edit AI Suggested Message</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <Label>Message Content</Label>
            <Textarea
              className="min-h-[160px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-150 dark:border-zinc-850 pt-4 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { ChatMsg } from "@/lib/types";

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-semibold text-accent">{part}</strong>;
    }
    return part;
  });
}

function formatMessage(content: string): React.ReactNode {
  const lines = content.split("\n");
  let inList = false;
  const listItems: React.ReactNode[] = [];
  const elements: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 flex flex-col gap-1">
          {[...listItems]}
        </ul>
      );
      listItems.length = 0;
      inList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith("### ")) {
      flushList(`flush-${idx}`);
      elements.push(
        <h3 key={idx} className="font-display font-semibold text-base mt-4 mb-2 text-ink first:mt-1">
          {trimmed.replace("### ", "")}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(`flush-${idx}`);
      elements.push(
        <h2 key={idx} className="font-display font-semibold text-lg mt-5 mb-2 text-ink first:mt-1">
          {trimmed.replace("## ", "")}
        </h2>
      );
    } else if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      inList = true;
      const cleanLine = trimmed.replace(/^[•-]\s*/, "");
      listItems.push(
        <li key={`li-${idx}`} className="text-ink text-sm leading-relaxed">
          {parseBold(cleanLine)}
        </li>
      );
    } else if (trimmed === "") {
      flushList(`flush-${idx}`);
      elements.push(<div key={idx} className="h-2" />);
    } else {
      flushList(`flush-${idx}`);
      elements.push(
        <p key={idx} className="text-sm text-ink leading-relaxed mb-1.5 last:mb-0">
          {parseBold(trimmed)}
        </p>
      );
    }
  });

  flushList("final");
  return <div className="space-y-1">{elements}</div>;
}

const SUGGESTIONS = [
  "Who should I call today?",
  "Why are sales dropping?",
  "Which customers are inactive?",
  "How can I increase repeat customers?",
  "Should I invest in marketing?",
  "Which products perform poorly?",
];

export default function ChatPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!businessId) return;
    api.get<{ messages: ChatMsg[] }>(`/api/chat/${businessId}`).then((res) => setMessages(res.messages));
  }, [businessId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || !businessId) return;
    setSending(true);
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: question, createdAt: new Date().toISOString() }]);
    try {
      const res = await api.post<{ message: ChatMsg }>("/api/chat/ask", { businessId, question });
      setMessages((m) => [...m, res.message]);
    } finally {
      setSending(false);
    }
  }

  if (sessionLoading) return <AppShell><div className="text-muted">Loading…</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-1">AI Chat</h1>
      <p className="text-muted mb-6">Ask about your business — every answer explains why.</p>

      <div className="card flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="pill bg-surface2 border border-border text-sm hover:border-accent/50">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${m.role === "user" ? "self-end" : "self-start"}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-accent text-white" : "bg-surface2 border border-border"}`}>
                {m.role === "user" ? m.content : formatMessage(m.content)}
              </div>
            </div>
          ))}
          {sending && <div className="self-start text-muted text-sm">Nexora is thinking…</div>}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex items-center gap-3 p-4 border-t border-border"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Nexora about your business…"
          />
          <button className="btn-primary" disabled={sending || !input.trim()}>Send</button>
        </form>
      </div>
    </AppShell>
  );
}

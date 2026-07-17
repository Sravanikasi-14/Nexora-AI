"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { ChatMsg } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, RotateCw } from "lucide-react";

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
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 flex flex-col gap-1 text-left">
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
        <h3 key={idx} className="font-display font-semibold text-base mt-4 mb-2 text-zinc-900 dark:text-zinc-50 first:mt-1 text-left">
          {trimmed.replace("### ", "")}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(`flush-${idx}`);
      elements.push(
        <h2 key={idx} className="font-display font-semibold text-lg mt-5 mb-2 text-zinc-900 dark:text-zinc-50 first:mt-1 text-left">
          {trimmed.replace("## ", "")}
        </h2>
      );
    } else if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      inList = true;
      const cleanLine = trimmed.replace(/^[•-]\s*/, "");
      listItems.push(
        <li key={`li-${idx}`} className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed">
          {parseBold(cleanLine)}
        </li>
      );
    } else if (trimmed === "") {
      flushList(`flush-${idx}`);
      elements.push(<div key={idx} className="h-2" />);
    } else {
      flushList(`flush-${idx}`);
      elements.push(
        <p key={idx} className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed mb-1.5 last:mb-0 text-left">
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
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // React Query: Fetch chat history
  const { data: chatPayload, isLoading: fetchLoading } = useQuery({
    queryKey: ["chat", businessId],
    queryFn: () => api.get<{ messages: ChatMsg[] }>(`/api/chat/${businessId}`),
    enabled: !!businessId,
  });

  const messages = chatPayload?.messages || [];

  // Find last user question for regeneration feature
  const lastUserQuestion = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === "user");
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : null;
  }, [messages]);

  // React Query: Mutation for sending chats with optimistic updates
  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await api.post<{ message: ChatMsg }>("/api/chat/ask", { businessId, question });
      return res.message;
    },
    onMutate: async (question) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["chat", businessId] });

      // Save previous chat data snapshot
      const previousData = queryClient.getQueryData<{ messages: ChatMsg[] }>(["chat", businessId]);

      // Optimistically append user message
      if (previousData) {
        queryClient.setQueryData(["chat", businessId], {
          messages: [
            ...previousData.messages,
            {
              id: `tmp-${Date.now()}`,
              role: "user",
              content: question,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }

      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["chat", businessId], context.previousData);
      }
      alert("Failed to send message.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", businessId] });
    },
  });

  // Auto-scroll timeline to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending]);

  function handleSend(question: string) {
    if (!question.trim() || !businessId || askMutation.isPending) return;
    askMutation.mutate(question);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loading = sessionLoading || fetchLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-1 text-left">AI Chat</h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6 text-left">Ask about your business — every answer explains why.</p>

      <Card className="flex flex-col h-[65vh] border border-border shadow-premium bg-surface text-ink overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto py-8 text-center">
              <span className="text-xs text-zinc-400 w-full mb-3 font-semibold uppercase tracking-wider">Suggested Queries</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="pill bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border border-border text-xs font-semibold px-3.5 py-1.5 transition-colors cursor-pointer"
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            const isLatestAI = !isUser && idx === messages.length - 1;
            return (
              <div key={m.id} className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse text-right" : "self-start flex-row text-left"}`}>
                {/* AI / User Avatar */}
                {!isUser ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-650 dark:from-zinc-100 dark:to-zinc-400 flex items-center justify-center font-bold text-white dark:text-zinc-900 text-xs shrink-0 shadow-premium">
                    ✨
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-border flex items-center justify-center font-semibold text-zinc-500 text-xs shrink-0">
                    👤
                  </div>
                )}
                
                {/* Message Bubble + Actions */}
                <div className="space-y-1">
                  <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm transition-all relative group ${
                    isUser 
                      ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-tr-none" 
                      : "bg-zinc-50 dark:bg-zinc-900/30 border border-border text-zinc-900 dark:text-zinc-50 rounded-tl-none"
                  }`}>
                    {isUser ? m.content : formatMessage(m.content)}
                  </div>
                  
                  {/* Actions (Copy + Regenerate) */}
                  {!isUser && (
                    <div className="flex items-center gap-2 pl-2 text-[10px] text-zinc-400">
                      <button
                        onClick={() => copyToClipboard(m.id, m.content)}
                        className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors flex items-center gap-1 py-0.5"
                        title="Copy to clipboard"
                        type="button"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check size={10} className="text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      
                      {isLatestAI && lastUserQuestion && (
                        <button
                          onClick={() => handleSend(lastUserQuestion)}
                          className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors flex items-center gap-1 py-0.5"
                          title="Regenerate response"
                          type="button"
                        >
                          <RotateCw size={10} />
                          <span>Regenerate</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {askMutation.isPending && (
            <div className="flex gap-3 self-start items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-650 dark:from-zinc-100 dark:to-zinc-400 flex items-center justify-center font-bold text-white dark:text-zinc-900 text-xs shrink-0 animate-pulse">
                ✨
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-border text-zinc-900 dark:text-zinc-50 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2">
                <span className="text-zinc-500">Nexora is thinking</span>
                <div className="flex gap-1 items-center pt-0.5">
                  <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sticky Auto-growing Input Bar */}
        <form
          className="flex items-end gap-3 p-4 border-t border-border bg-zinc-50/20 dark:bg-zinc-900/10"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask Nexora about your business..."
              disabled={askMutation.isPending}
              className="flex w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-xs shadow-sm transition-all focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300 resize-none max-h-44 min-h-[38px] overflow-y-auto leading-normal"
            />
          </div>
          <Button type="submit" disabled={askMutation.isPending || !input.trim()} className="h-9">
            Send
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}

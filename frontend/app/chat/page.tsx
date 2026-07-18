"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, getStoredUser } from "@/lib/api";
import { ChatMsg } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Plus,
  FileText,
  Image as ImageIcon,
  BarChart2,
  Mail,
  Share2,
  Cpu,
  Bookmark,
  ChevronRight,
  TrendingUp,
  Download,
  Copy,
  Check,
  RotateCw,
  Clock,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  type: "image" | "spreadsheet" | "document";
  progress: number;
  previewUrl?: string;
  completed: boolean;
}

interface MockConversation {
  id: string;
  title: string;
  group: "Today" | "Yesterday" | "Earlier";
}

// Formatted response component with segment boxes
function FormattedResponse({ content }: { content: string }) {
  const [copiedText, setCopiedText] = useState(false);

  const sections = useMemo(() => {
    const sectionSpecs = [
      { title: "Summary", keywords: ["summary", "overall", "briefing"], icon: "📋", color: "border-blue-500/20 bg-blue-500/[0.02]" },
      { title: "Key Insights", keywords: ["insight", "key insights", "findings", "analysis"], icon: "🔍", color: "border-indigo-500/20 bg-indigo-500/[0.02]" },
      { title: "Recommendation", keywords: ["recommendation", "strategy", "campaign"], icon: "💡", color: "border-amber-500/20 bg-amber-500/[0.02]" },
      { title: "Expected Impact", keywords: ["impact", "expected impact", "projected", "forecast"], icon: "📈", color: "border-emerald-500/20 bg-emerald-500/[0.02]" },
      { title: "Suggested Next Actions", keywords: ["action", "next actions", "next steps", "todo"], icon: "▶", color: "border-rose-500/20 bg-rose-500/[0.02]" }
    ];

    const lines = content.split("\n");
    const tempSections: Record<string, string[]> = {};
    sectionSpecs.forEach(s => { tempSections[s.title] = []; });
    tempSections["General"] = [];

    let activeTitle = "General";

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cleanedLine = trimmed.replace(/^#+\s+/, "");
      let found = false;

      for (const spec of sectionSpecs) {
        const lowerLine = cleanedLine.toLowerCase();
        const isHeader = spec.keywords.some(kw => {
          return lowerLine === kw || 
                 lowerLine.startsWith(kw + ":") || 
                 lowerLine.startsWith("**" + kw + "**") ||
                 (lowerLine.includes(kw) && (lowerLine.startsWith("###") || lowerLine.startsWith("##") || lowerLine.startsWith("#")));
        });

        if (isHeader) {
          activeTitle = spec.title;
          found = true;
          break;
        }
      }

      if (!found) {
        tempSections[activeTitle].push(line);
      }
    });

    const generalLines = tempSections["General"];
    const hasParsedSections = sectionSpecs.some(spec => tempSections[spec.title].length > 0);

    if (!hasParsedSections && generalLines.length > 0) {
      const paragraphs: string[][] = [[]];
      let pIdx = 0;
      generalLines.forEach(line => {
        if (line.trim().startsWith("-") || line.trim().startsWith("*") || /^\d+\./.test(line.trim())) {
          paragraphs[pIdx].push(line);
        } else {
          if (paragraphs[pIdx].length > 0) {
            paragraphs.push([]);
            pIdx++;
          }
          paragraphs[pIdx].push(line);
        }
      });

      paragraphs.forEach((pLines, idx) => {
        if (pLines.length === 0) return;
        if (idx === 0) {
          tempSections["Summary"] = pLines;
        } else if (idx === 1) {
          tempSections["Key Insights"] = pLines;
        } else if (idx === 2) {
          tempSections["Recommendation"] = pLines;
        } else if (idx === 3) {
          tempSections["Expected Impact"] = pLines;
        } else {
          tempSections["Suggested Next Actions"] = [...(tempSections["Suggested Next Actions"] || []), ...pLines];
        }
      });
      tempSections["General"] = [];
    }

    const finalSections: { title: string; icon: string; color: string; content: string[] }[] = [];
    sectionSpecs.forEach(spec => {
      const linesOfSec = tempSections[spec.title];
      if (linesOfSec && linesOfSec.length > 0) {
        finalSections.push({
          title: spec.title,
          icon: spec.icon,
          color: spec.color,
          content: linesOfSec
        });
      }
    });

    if (tempSections["General"] && tempSections["General"].length > 0) {
      finalSections.push({
        title: "Overview",
        icon: "📋",
        color: "border-zinc-200/40 bg-zinc-50/[0.01]",
        content: tempSections["General"]
      });
    }

    return finalSections;
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const renderTextWithHighlights = (text: string) => {
    const parts = text.split(/(₹\d+(?:,\d+)*(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d{2,}(?:,\d+)*\b)/g);
    return parts.map((part, i) => {
      const isMatch = /^(₹\d|\d+%|\d{2,})/.test(part);
      if (isMatch) {
        return (
          <span key={i} className="font-extrabold font-grotesk text-blue-600 dark:text-blue-400 bg-blue-500/[0.05] dark:bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/10 dark:border-blue-500/20">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const renderSectionContent = (title: string, lines: string[]) => {
    const isTemplate = title.toLowerCase().includes("copy") || title.toLowerCase().includes("template");
    
    if (isTemplate) {
      return (
        <div className="text-xs leading-relaxed text-zinc-850 dark:text-zinc-150 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800 p-3 rounded-lg font-mono whitespace-pre-wrap select-all">
          {lines.join("\n")}
        </div>
      );
    }

    return (
      <ul className="space-y-2.5">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          const textContent = trimmed.replace(/^[-*\s]+/, "").replace(/^\d+\.\s*/, "");
          return (
            <li key={idx} className="flex gap-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 font-medium font-body items-start">
              <span className="text-blue-500 select-none mt-1 shrink-0 text-[10px]">🔹</span>
              <span>{renderTextWithHighlights(textContent)}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-5 text-left w-full">
      {sections.map((sec) => (
        <div key={sec.title} className={`border rounded-[18px] p-5 shadow-premium-sm transition-all duration-300 ${sec.color} hover:scale-[1.005]`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 mb-3">
            <span className="text-sm">{sec.icon}</span>
            <span>{sec.title}</span>
          </span>
          <div className="pl-0.5">
            {renderSectionContent(sec.title, sec.content)}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-1">
        <Button size="sm" variant="ghost" className="text-[10px] gap-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-[12px] h-8" onClick={handleCopy}>
          {copiedText ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copiedText ? "Copied" : "Copy strategy"}
        </Button>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // File Upload States
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Thinking Tips Index
  const [tipIndex, setTipIndex] = useState(0);

  // Mock Conversations (Left Sidebar)
  const mockConversations: MockConversation[] = [
    { id: "c1", title: "Instagram loyalty post template", group: "Today" },
    { id: "c2", title: "Marketing email blast campaign", group: "Today" },
    { id: "c3", title: "Weekend discount broadcast copy", group: "Yesterday" },
    { id: "c4", title: "CSV transaction metrics review", group: "Earlier" },
    { id: "c5", title: "Social media target sync", group: "Earlier" },
  ];

  const [activeChatId, setActiveChatId] = useState("current");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
  }, []);

  // React Query: Fetch chat history
  const { data: chatPayload, isLoading: fetchLoading } = useQuery({
    queryKey: ["chat", businessId],
    queryFn: () => api.get<{ messages: ChatMsg[] }>(`/api/chat/${businessId}`),
    enabled: !!businessId,
  });

  const messages = chatPayload?.messages || [];



  const loaderTips = [
    "Analyzing your request...",
    "Reviewing business context...",
    "Generating recommendations...",
    "Almost ready..."
  ];

  // React Query: Mutation for sending chats
  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await api.post<{ message: ChatMsg }>("/api/chat/ask", { businessId, question });
      return res.message;
    },
    onMutate: async (question) => {
      await queryClient.cancelQueries({ queryKey: ["chat", businessId] });
      const previousData = queryClient.getQueryData<{ messages: ChatMsg[] }>(["chat", businessId]);

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
      alert("Failed to send query.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", businessId] });
      setFiles([]); // Clear completed uploads
    },
  });

  // Cycle thinking phrases only when query is pending
  useEffect(() => {
    if (!askMutation.isPending) {
      setTipIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, [askMutation.isPending]);

  // Auto-scroll timeline to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending]);

  const handleSend = (text: string) => {
    if (!text.trim() || !businessId || askMutation.isPending) return;

    // Append context of uploaded files if any
    let queryText = text;
    if (files.length > 0) {
      const fileNames = files.map((f) => f.name).join(", ");
      queryText += ` [Attachment Context: Analyzed file assets ${fileNames}]`;
    }

    askMutation.mutate(queryText);
  };

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

  // Microphone/Voice input trigger
  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${speechToText}` : speechToText));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Mock File Upload process
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      let type: UploadedFile["type"] = "document";
      let previewUrl: string | undefined;

      if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
        type = "image";
        previewUrl = URL.createObjectURL(f);
      } else if (["csv", "xlsx", "xls"].includes(ext || "")) {
        type = "spreadsheet";
      }

      const fileId = `file-${Date.now()}-${Math.random()}`;
      const newFile: UploadedFile = {
        id: fileId,
        name: f.name,
        type,
        progress: 10,
        completed: false,
        previewUrl,
      };

      setFiles((prev) => [...prev, newFile]);

      // Progress bar simulation
      let progress = 10;
      const interval = setInterval(() => {
        progress += 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progress: 100, completed: true } : item
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progress } : item
            )
          );
        }
      }, 300);
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Toolbox actions handler
  const handleToolboxClick = (actionText: string) => {
    setInput(actionText);
    textareaRef.current?.focus();
  };

  const loading = sessionLoading || fetchLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2 text-left">
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
      <div className="relative flex flex-col md:flex-row gap-6 min-h-[calc(100vh-8rem)] text-left">
        
        {/* LEFT SIDEBAR: Recent Conversations */}
        <aside className="w-full md:w-56 shrink-0 flex flex-col gap-4 border border-zinc-200/40 dark:border-zinc-900/60 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[24px] p-4 h-[calc(100vh-10rem)] sticky top-24 overflow-y-auto">
          <div className="border-b border-zinc-200/10 dark:border-zinc-900/10 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-505 block">Recent Conversations</span>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            {["Today", "Yesterday", "Earlier"].map((group) => {
              const items = mockConversations.filter((c) => c.group === group);
              if (items.length === 0) return null;

              return (
                <div key={group} className="space-y-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-450 dark:text-zinc-555">{group}</span>
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToolboxClick(item.title)}
                        className={`text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 px-2.5 py-1.5 rounded-lg border border-transparent transition-all truncate text-left w-full`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col justify-between min-h-[500px] h-[calc(100vh-10rem)] border border-zinc-250/70 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[28px] p-6 shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[90px] pointer-events-none" />

          {/* PAGE HEADER & CONVERSATION CANVAS */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin">
            
            {/* Header when message feed is empty */}
            {messages.length === 0 && (
              <div className="space-y-8 py-6">
                <div>
                  <h1 className="font-sora text-3xl font-black tracking-tight text-zinc-950 dark:text-white">AI Assistant</h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-normal tracking-wide font-body mt-1">What would you like to create today?</p>
                </div>

                {/* Quick Action Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                  {[
                    { label: "📝 Write Instagram Post", query: "✨ Create Instagram Campaign detailing our loyalty program metrics" },
                    { label: "📧 Generate Marketing Email", query: "📧 Write Customer Email offering a 10% returning loyalty voucher" },
                    { label: "💬 WhatsApp Campaign", query: "💬 Generate WhatsApp Broadcast template for new product launch" },
                    { label: "📈 Analyze Sales Data", query: "📈 Explain My Dashboard performance changes this month" },
                    { label: "📊 Explain Report Metrics", query: "📊 Analyze Uploaded CSV report logs" },
                    { label: "🎯 Marketing Strategy", query: "🎯 Build Marketing Plan to target returning buyers" },
                    { label: "📦 Product Description", query: "Write a high-end product copy highlighting quality standards" },
                    { label: "⭐ Business Ideas", query: "🧠 Brainstorm Business Ideas to re-engage VIP cooling accounts" }
                  ].map((act, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -3, scale: 1.01 }}
                      onClick={() => handleSend(act.query)}
                      className="border border-zinc-200/40 dark:border-zinc-900/50 bg-white/50 dark:bg-zinc-950/40 rounded-[20px] p-4 shadow-sm hover:shadow-premium transition-all duration-300 cursor-pointer flex flex-col justify-center min-h-[72px]"
                    >
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 font-body leading-snug">{act.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="flex flex-col gap-6">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse" : "self-start flex-row"}`}>
                    
                    {/* Avatar */}
                    {!isUser ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                        ✨
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 flex items-center justify-center text-zinc-550 shrink-0 shadow-sm text-xs">
                        👤
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className={`rounded-[20px] px-4 py-3 shadow-sm transition-all border ${
                        isUser
                          ? "bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-900 dark:text-zinc-100 text-left"
                          : "bg-white/90 dark:bg-zinc-950/80 border-zinc-250/50 dark:border-zinc-900 text-zinc-900 dark:text-zinc-50"
                      }`}>
                        {isUser ? (
                          <p className="text-xs font-semibold leading-relaxed font-body whitespace-pre-line text-left">{m.content}</p>
                        ) : (
                          <FormattedResponse content={m.content} />
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {/* LOADING ROTATING BUSINESS TIPS */}
              {askMutation.isPending && (
                <div className="flex gap-3 self-start items-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs shrink-0 animate-pulse">
                    ✨
                  </div>
                  <div className="bg-white/90 dark:bg-zinc-950/80 border border-zinc-250/50 dark:border-zinc-900 rounded-[20px] px-5 py-3.5 flex items-center gap-3">
                    <Spinner size="sm" />
                    <div className="text-xs text-left">
                      <p className="font-bold text-zinc-800 dark:text-zinc-150 animate-pulse">
                        {loaderTips[tipIndex]}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

          </div>

          {/* BOTTOM ATTACHED WORKSPACE INPUT */}
          <div className="mt-4 pt-4 border-t border-zinc-200/10 dark:border-zinc-900/10 space-y-4">
            
            {/* Display uploaded files progress decks */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {files.map((file) => {
                  const isImage = file.type === "image";
                  const isSheet = file.type === "spreadsheet";
                  return (
                    <div key={file.id} className="border border-zinc-250 dark:border-zinc-900 bg-white/60 dark:bg-zinc-950/80 p-2.5 rounded-[16px] flex items-center gap-3 min-w-[200px] max-w-xs shadow-sm relative group">
                      
                      {isImage && file.previewUrl ? (
                        <img src={file.previewUrl} className="w-9 h-9 object-cover rounded-lg shrink-0" alt="uploaded asset" />
                      ) : (
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                          {isSheet ? <FileText size={16} /> : <FileText size={16} />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[10px] font-black truncate text-zinc-900 dark:text-white">{file.name}</p>
                        {!file.completed ? (
                          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-blue-500" style={{ width: `${file.progress}%` }} />
                          </div>
                        ) : (
                          <span className="text-[8px] text-emerald-500 font-bold block mt-0.5 uppercase tracking-wider">Ready to analyze</span>
                        )}

                        {/* Interactive triggers for Spreadsheets */}
                        {isSheet && file.completed && (
                          <div className="flex gap-1.5 mt-1.5">
                            <button onClick={() => handleSend("Generate Insights for spreadsheet data")} className="text-[7px] bg-blue-500/15 border border-blue-500/20 text-blue-500 px-1 py-0.5 rounded font-black uppercase">Insights</button>
                            <button onClick={() => handleSend("Find Trends inside CSV")} className="text-[7px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 px-1 py-0.5 rounded font-black uppercase">Trends</button>
                            <button onClick={() => handleSend("Summarize uploaded data")} className="text-[7px] bg-purple-500/15 border border-purple-500/20 text-purple-500 px-1 py-0.5 rounded font-black uppercase">Summarize</button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition shadow-md border border-zinc-800"
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main Rounded Text Input Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-end gap-3 p-2 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl border border-zinc-200/40 dark:border-zinc-900/60 shadow-inner"
            >
              <button
                type="button"
                onClick={triggerFileUpload}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-200/60 dark:bg-zinc-800/40 text-zinc-650 hover:bg-zinc-200 dark:hover:bg-zinc-850 shrink-0 transition"
                title="Attach file"
              >
                <Paperclip size={15} />
              </button>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-zinc-200/60 dark:bg-zinc-800/40 text-zinc-650"
                }`}
                title={isListening ? "Stop listening" : "Speak to CGO productivity assistant"}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>

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
                placeholder="Ask your AI Assistant anything..."
                disabled={askMutation.isPending}
                className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-850 dark:text-zinc-200 px-2 py-2 placeholder-zinc-400 max-h-36 min-h-[38px] resize-none overflow-y-auto leading-normal"
              />

              <button
                type="submit"
                disabled={askMutation.isPending || (!input.trim() && files.length === 0)}
                className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-50 hover:opacity-90 text-white dark:text-zinc-950 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                title="Send query"
              >
                <Send size={14} />
              </button>
            </form>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,.csv,.xls,.xlsx,.doc,.docx,.pdf"
            />
          </div>

        </div>

        {/* RIGHT SIDEBAR: AI Toolbox Shortcuts */}
        <aside className="w-full md:w-56 shrink-0 flex flex-col gap-4 border border-zinc-200/40 dark:border-zinc-900/60 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[24px] p-4 h-[calc(100vh-10rem)] sticky top-24 overflow-y-auto">
          <div className="border-b border-zinc-200/10 dark:border-zinc-900/10 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-505 block">AI Toolbox</span>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { label: "📄 Upload File", query: triggerFileUpload, icon: FileText, color: "text-blue-500 bg-blue-500/10" },
              { label: "🖼 Analyze Image", query: () => handleToolboxClick("Analyze the uploaded image and generate descriptive marketing text"), icon: ImageIcon, color: "text-rose-500 bg-rose-500/10" },
              { label: "📊 Explain Report", query: () => handleToolboxClick("Explain key findings from this business report CSV logs"), icon: BarChart2, color: "text-amber-500 bg-amber-500/10" },
              { label: "📧 Write Email", query: () => handleToolboxClick("Write a formal customer support email about discount coupons"), icon: Mail, color: "text-purple-500 bg-purple-500/10" },
              { label: "📣 Marketing Copy", query: () => handleToolboxClick("Generate 3 premium copywriting headlines for our homepage header"), icon: Sparkles, color: "text-indigo-500 bg-indigo-500/10" },
              { label: "📱 Social Media", query: () => handleToolboxClick("Generate Instagram post captions for weekend loyalty incentives"), icon: Share2, color: "text-pink-500 bg-pink-500/10" },
              { label: "📈 Sales Analysis", query: () => handleToolboxClick("Provide recommendations based on our weekend sales growth numbers"), icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
            ].map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <button
                  key={idx}
                  onClick={typeof tool.query === "function" ? tool.query : undefined}
                  className="flex items-center gap-3 p-2.5 border border-zinc-200/20 dark:border-zinc-900/40 rounded-xl bg-white/30 dark:bg-zinc-950/20 hover:shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left w-full"
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${tool.color}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

      </div>
    </AppShell>
  );
}

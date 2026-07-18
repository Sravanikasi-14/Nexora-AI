"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api, getStoredUser } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { useQuery } from "@tanstack/react-query";
import { DashboardPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { motion, useReducedMotion, animate } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Activity,
  ArrowRight,
  TrendingUp,
  Heart,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

interface ChatMessage {
  sender: "cgo" | "user";
  text: string;
  questionPrompt?: string;
}

function CompactHealthScoreCircle({ score }: { score: number }) {
  const size = 100;
  const strokeWidth = 8;
  const radius = 38;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (score / 100) * circum;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center mx-auto">
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle cx={size/2} cy={size/2} r={radius} className="stroke-zinc-150 dark:stroke-zinc-900 fill-none" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id="compactHealthGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <motion.circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          className="fill-none stroke-linecap-round" 
          stroke="url(#compactHealthGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circum}
          initial={{ strokeDashoffset: circum }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black font-grotesk tracking-tight text-zinc-950 dark:text-white">{score}%</span>
        <span className="text-[7px] uppercase tracking-wider text-zinc-400 font-bold">Maturity</span>
      </div>
    </div>
  );
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

export default function TalkPage() {
  const { business, businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [thinkingMessage, setThinkingMessage] = useState("Analyzing business data...");
  const [manualInput, setManualInput] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");

  // Strategic Meeting Step Management
  const [currentStep, setCurrentStep] = useState<"intro" | "briefing" | "chat">("intro");
  const [briefingIndex, setBriefingIndex] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    // Check voice support on mount
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceSupported(false);
    }
    // Query mic permission if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((result) => {
        setMicPermission(result.state as "granted" | "denied" | "unknown");
        result.onchange = () => setMicPermission(result.state as "granted" | "denied" | "unknown");
      }).catch(() => {});
    }
  }, []);

  // React Query: Fetch dashboard payload
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardPayload>({
    queryKey: ["dashboard", businessId],
    queryFn: () => api.get<DashboardPayload>(`/api/dashboard/${businessId}`),
    enabled: !!businessId,
  });

  const loading = sessionLoading || dashboardLoading;
  const adv = dashboardData?.advancedMetrics;
  const churnCount = adv?.churnRiskCount || 0;

  // Auto-scroll chat window
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Cycle thinking phrases
  useEffect(() => {
    if (status === "thinking") {
      const messages = [
        "Analyzing business data...",
        "Evaluating cash flow velocity...",
        "Identifying churn risks...",
        "Formulating action suggestions..."
      ];
      let i = 0;
      thinkingTimer.current = setInterval(() => {
        i = (i + 1) % messages.length;
        setThinkingMessage(messages[i]);
      }, 2000);
    } else {
      if (thinkingTimer.current) clearInterval(thinkingTimer.current);
    }
    return () => {
      if (thinkingTimer.current) clearInterval(thinkingTimer.current);
    };
  }, [status]);

  // Voice speech synthesis utterance builder — waits for voices to load
  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !soundEnabled) return;
    window.speechSynthesis.cancel();

    // Strip Markdown bold symbols for natural speech synthesis voice
    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    setStatus("speaking");

    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    const selectVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(
        (v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("US English") || v.lang === "en-US"
      );
      if (premiumVoice) utterance.voice = premiumVoice;
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      selectVoiceAndSpeak();
    } else {
      // Voices not yet loaded — wait for the event
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        selectVoiceAndSpeak();
      };
    }
  }, [soundEnabled]);

  // Clean utterance synthesis speech on unload
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const processQuery = useCallback(async (queryText: string) => {
    if (!queryText.trim()) return;

    setChatHistory(prev => [...prev, { sender: "user", text: queryText }]);
    setStatus("thinking");

    try {
      const res = await api.post<{ message: { content: string } }>(
        "/api/chat/ask?useCore=true",
        {
          businessId,
          question: queryText,
          useCore: true,
        }
      );

      const reply = res.message.content;

      // CGO proactive question logic to drive conversation forward
      let followUp = "";
      const lower = reply.toLowerCase();
      if (lower.includes("revenue") || lower.includes("sales")) {
        followUp = "Would you like me to walk through potential ways to improve weekend sales?";
      } else if (lower.includes("customer") || lower.includes("churn") || lower.includes("loyalty")) {
        followUp = "Would you like me to explain customer churn segments or loyalty setups?";
      } else if (lower.includes("marketing") || lower.includes("instagram") || lower.includes("seo")) {
        followUp = "Should we discuss keyword optimization strategies for Instagram?";
      } else {
        followUp = "Should I prepare a step-by-step action plan to recover inactive accounts?";
      }

      setChatHistory(prev => [...prev, { 
        sender: "cgo", 
        text: reply,
        questionPrompt: followUp 
      }]);

      if (soundEnabled) {
        speakText(reply);
      } else {
        setStatus("idle");
      }
    } catch (e) {
      console.error("AI CGO query failure:", e);
      setChatHistory(prev => [...prev, { 
        sender: "cgo", 
        text: "I hit a synchronization hiccup connecting to the CGO engine. Could you retry?" 
      }]);
      setStatus("idle");
    }
  }, [businessId, soundEnabled, speakText]);

  const toggleListening = async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Voice recognition is not supported in this browser. Please use Chrome or Edge, or type your query below.");
      return;
    }

    if (status === "speaking") {
      window.speechSynthesis.cancel();
      setStatus("idle");
      return;
    }

    if (status === "listening") {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    // Request microphone permission explicitly before starting
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
    } catch (permErr: any) {
      setMicPermission("denied");
      if (permErr.name === "NotAllowedError" || permErr.name === "PermissionDeniedError") {
        setMicError("Microphone access was denied. Please allow microphone access in your browser settings, or type your query below.");
      } else {
        setMicError("Could not access microphone. Please check your device and try again, or type your query below.");
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
      finalTranscriptRef.current = "";
      setMicError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript = event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const text = finalTranscript || interimTranscript;
      if (text) {
        setTranscript(text);
        finalTranscriptRef.current = finalTranscript || finalTranscriptRef.current || interimTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow access in browser settings.",
        "no-speech": "No speech detected. Please speak clearly and try again.",
        "audio-capture": "No microphone found. Please connect a microphone and try again.",
        "network": "Network error during recognition. Please check your connection.",
        "aborted": "",
      };
      const message = errorMessages[event.error] || `Voice error (${event.error}). Please try again or type below.`;
      if (message) setMicError(message);
      setStatus("idle");
    };

    recognition.onend = () => {
      const text = finalTranscriptRef.current;
      if (text.trim()) {
        setCurrentStep("chat");
        processQuery(text.trim());
      } else {
        setStatus("idle");
      }
    };

    recognition.start();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || status === "thinking" || status === "listening") return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setMicError(null);
    setCurrentStep("chat");
    processQuery(manualInput);
    setManualInput("");
  };

  // Strategic Briefing steps setup
  const briefingSteps = useMemo(() => {
    const opportunities = dashboardData?.todaysMissions?.reduce((s, m) => s + (m.projectedImpact || 0), 0) || 18400;
    return [
      {
        title: "Revenue Trends",
        desc: `Current monthly billing stands at ₹${(adv?.monthlySales || 50000).toLocaleString()}. Core revenue indicators show positive growth curves, with peak activity concentrated during weekend sales.`,
        question: "Would you like to improve revenue?",
        icon: DollarSign,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
      },
      {
        title: "Customer Cohort Activity",
        desc: `Loyalty index checks scanned ${adv?.repeatCustomers || 42} active repeat buyers. However, ${churnCount || 7} profiles haven't purchased within standard frequency gaps and are flagged as at-risk.`,
        question: "Would you like me to explain customer churn?",
        icon: Users,
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20"
      },
      {
        title: "Marketing & Presence maturity",
        desc: `Digital footprint checks return an onboarding maturity score of ${dashboardData?.digitalMaturity || 92}%. Local keyword discovery index is healthy, but social campaign integrations can yield higher visibility.`,
        question: "Should we discuss marketing?",
        icon: Activity,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
      },
      {
        title: "Strategic CGO Recommendations",
        desc: `CGO recommends launching the basket recovery automation flow immediately (estimated ₹${opportunities.toLocaleString()}/mo lift) and syncing local listings reviews.`,
        question: "Should I create an action plan?",
        icon: Sparkles,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      }
    ];
  }, [dashboardData, adv, churnCount]);

  const handleNextBriefing = () => {
    if (briefingIndex < briefingSteps.length - 1) {
      setBriefingIndex(prev => prev + 1);
    } else {
      // Transition to active chat with prompt suggestions loaded
      setCurrentStep("chat");
      setChatHistory([
        {
          sender: "cgo",
          text: "I've completed today's executive briefing analysis. Let's build your growth workspace checklist.",
          questionPrompt: "Should I create an action plan?"
        }
      ]);
    }
  };

  const handleBriefingQuestionClick = (question: string) => {
    setCurrentStep("chat");
    setChatHistory([
      {
        sender: "cgo",
        text: "Analyzing business strategy data based on your select briefing interest..."
      }
    ]);
    processQuery(question);
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Skeleton className="h-[400px] lg:col-span-3" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style>{`
        @keyframes voice-waveform {
          0%, 100% { height: 12px; }
          50% { height: 40px; }
        }
        .animate-waveform-bar {
          animation: voice-waveform 1.1s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex flex-col min-h-[calc(100vh-8rem)] text-left">
        {/* Page Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200/10 dark:border-zinc-900/20 mb-6">
          <div>
            <h1 className="text-2xl font-black font-sora text-zinc-950 dark:text-white uppercase tracking-wider">CGO Strategy Room</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">Strategic growth consultation with Chief Growth Officer.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-full border border-zinc-200/10 dark:border-zinc-900/20 transition-all flex items-center justify-center ${
                soundEnabled ? "bg-blue-600/10 text-blue-500 border-blue-500/20" : "bg-transparent text-zinc-400"
              }`}
              title={soundEnabled ? "Mute speech audio" : "Enable voice out"}
              type="button"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* WORKSPACE CONTENT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start flex-1 mb-6">
          
          {/* Main Strategic Meeting Area (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col min-h-[500px] h-[calc(100vh-22rem)] justify-between bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl border border-zinc-250/70 dark:border-zinc-900 rounded-[28px] p-6 shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              
              {/* STATE 1: INTRO SESSION OPENING */}
              {currentStep === "intro" && (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto space-y-8 py-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-premium">
                      <Sparkles size={36} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black font-sora text-zinc-950 dark:text-white">
                      {getGreeting()}, {user?.name?.split(" ")[0] || "Partner"} 👋
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed font-body">
                      I&apos;ve analyzed your business metrics and prepared today&apos;s strategic growth briefing. Let&apos;s align on your targets.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                      <Button 
                        onClick={() => setCurrentStep("briefing")}
                        className="w-full sm:w-auto px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 rounded-[18px] shadow-sm flex items-center justify-center gap-1.5 border-0"
                      >
                        Show Executive Briefing <ArrowRight size={14} />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                      <Button 
                        onClick={() => setCurrentStep("chat")}
                        variant="secondary"
                        className="w-full sm:w-auto px-6 font-bold rounded-[18px] border border-zinc-200/50 dark:border-zinc-900/50"
                      >
                        Let&apos;s Talk
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* STATE 2: STRATEGIC MEETING BRIEFING (Insight Cards step-by-step) */}
              {currentStep === "briefing" && (
                <div className="space-y-6">
                  <div className="border-b border-zinc-200/10 dark:border-zinc-900/10 pb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Meeting Briefing</span>
                    <span className="text-[10px] text-zinc-400 font-bold">Insight {briefingIndex + 1} of {briefingSteps.length}</span>
                  </div>

                  <motion.div
                    key={briefingIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="border border-zinc-200/40 dark:border-zinc-900/50 bg-white/50 dark:bg-zinc-950/40 rounded-[20px] p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${briefingSteps[briefingIndex].color} border`}>
                        {(() => {
                          const Icon = briefingSteps[briefingIndex].icon;
                          return <Icon size={18} />;
                        })()}
                      </div>
                      <h3 className="text-sm font-black font-sora text-zinc-950 dark:text-white uppercase tracking-wider">
                        {briefingSteps[briefingIndex].title}
                      </h3>
                    </div>

                    <p className="text-xs text-zinc-550 dark:text-zinc-300 leading-relaxed font-body font-medium">
                      {briefingSteps[briefingIndex].desc}
                    </p>

                    <div className="pt-4 border-t border-zinc-200/10 dark:border-zinc-900/10 flex items-center justify-between gap-4">
                      <p className="text-[10px] text-zinc-400 font-bold">Proactive Focus Suggestion:</p>
                      <button
                        onClick={() => handleBriefingQuestionClick(briefingSteps[briefingIndex].question)}
                        className="text-[10px] text-blue-500 font-bold hover:underline"
                      >
                        {briefingSteps[briefingIndex].question}
                      </button>
                    </div>
                  </motion.div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep("intro")}
                      className="text-xs font-bold rounded-[18px]"
                    >
                      Back to intro
                    </Button>
                    <Button 
                      onClick={handleNextBriefing}
                      className="text-xs font-bold bg-zinc-950 text-white dark:bg-white dark:text-zinc-900 rounded-[18px]"
                    >
                      {briefingIndex === briefingSteps.length - 1 ? "Start Consultation" : "Next Insight"}
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 3: INTERACTIVE STRATEGIC CHAT */}
              {currentStep === "chat" && (
                <div className="flex flex-col gap-6">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-16 text-zinc-450 italic text-xs leading-relaxed font-body">
                      I&apos;ve analyzed your data and prepared suggestions. Speak or type below to start our strategic session.
                    </div>
                  )}

                  {chatHistory.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} w-full`}
                    >
                      <div className={`p-5 rounded-[20px] shadow-sm max-w-[85%] border text-left space-y-3 ${
                        msg.sender === "user"
                          ? "bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-800 dark:text-zinc-100"
                          : "bg-white/90 dark:bg-zinc-950/80 border-zinc-200/50 dark:border-zinc-900 text-zinc-800 dark:text-zinc-200"
                      }`}>
                        <div>
                          <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest block mb-1">
                            {msg.sender === "user" ? "Your query" : "CGO Advisor"}
                          </span>
                          {msg.sender === "user" ? (
                            <p className="text-xs leading-relaxed font-medium font-body whitespace-pre-line">{msg.text}</p>
                          ) : (
                            <FormattedResponse content={msg.text} />
                          )}
                        </div>

                        {/* Proactive clickable suggestions inside chat balloon */}
                        {msg.sender === "cgo" && msg.questionPrompt && (
                          <div className="pt-3 mt-2 border-t border-zinc-200/10 dark:border-zinc-900/10 flex items-center justify-between gap-4 flex-wrap">
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">AI Proposal</span>
                            <button
                              onClick={() => processQuery(msg.questionPrompt!)}
                              className="text-[10px] text-blue-500 font-bold hover:underline text-left"
                            >
                              {msg.questionPrompt}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Thinking state block */}
                  {status === "thinking" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="p-5 rounded-[20px] border border-zinc-200/30 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/40 space-y-2 max-w-sm">
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" />
                          <span className="text-[8px] font-black text-zinc-450 uppercase tracking-widest">Consulting CGO brain...</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic font-body">{thinkingMessage}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Audio speaking waveform */}
                  {status === "speaking" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="p-4 rounded-[20px] border border-zinc-200/30 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/40 flex items-center gap-4">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Audio Output Active</span>
                        <div className="flex gap-1 h-6 items-center">
                          <span className="w-1 bg-blue-500 rounded-full animate-waveform-bar" style={{ height: "12px", animationDelay: "0.1s" }} />
                          <span className="w-1 bg-blue-500 rounded-full animate-waveform-bar" style={{ height: "20px", animationDelay: "0.3s" }} />
                          <span className="w-1 bg-blue-500 rounded-full animate-waveform-bar" style={{ height: "15px", animationDelay: "0.5s" }} />
                          <span className="w-1 bg-blue-500 rounded-full animate-waveform-bar" style={{ height: "8px", animationDelay: "0.2s" }} />
                        </div>
                        <button
                          onClick={() => { window.speechSynthesis.cancel(); setStatus("idle"); }}
                          className="text-[9px] font-bold text-zinc-500 hover:text-red-500 transition-colors border border-zinc-200/30 dark:border-zinc-800/30 px-2 py-0.5 rounded-[8px]"
                        >
                          Stop
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}

            </div>

            {/* Manual Form input field & Mic trigger bar */}
            <div className="mt-4 pt-4 border-t border-zinc-200/10 dark:border-zinc-900/10 space-y-2">
              {/* Live transcript overlay when listening */}
              {status === "listening" && transcript && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-[14px] bg-red-500/5 border border-red-500/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mt-1.5 shrink-0" />
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 italic font-medium leading-relaxed">
                    &ldquo;{transcript}&rdquo;
                  </p>
                </div>
              )}
              {status === "listening" && !transcript && (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[10px] text-zinc-400 italic">Listening… speak now</p>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="flex gap-3 items-center bg-zinc-50/50 dark:bg-zinc-900/20 p-2 rounded-2xl border border-zinc-200/40 dark:border-zinc-900/60 shadow-inner">
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={!voiceSupported}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    status === "listening"
                      ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                      : !voiceSupported || micPermission === "denied"
                      ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed opacity-50"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                  title={
                    !voiceSupported
                      ? "Voice not supported in this browser"
                      : micPermission === "denied"
                      ? "Microphone access denied"
                      : status === "listening"
                      ? "Stop listening"
                      : "Speak with CGO"
                  }
                >
                  {status === "listening" ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <input
                  type="text"
                  placeholder={status === "listening" ? "Listening…" : "Type your question (e.g. 'improve my revenue')…"}
                  value={status === "listening" ? transcript : manualInput}
                  onChange={(e) => { if (status !== "listening") setManualInput(e.target.value); }}
                  disabled={status === "thinking" || status === "listening"}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-850 dark:text-zinc-200 px-2 py-2 placeholder-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim() || status === "thinking" || status === "listening"}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
              {micError && (
                <div className="flex items-start gap-2 px-1">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-relaxed flex-1">⚠️ {micError}</p>
                  <button
                    onClick={() => setMicError(null)}
                    className="text-[9px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 mt-0.5"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar: Business Snapshot (col-span-1) */}
          <div className="lg:col-span-1 space-y-6 text-left">
            <div className="border-b border-zinc-200/10 dark:border-zinc-900/20 pb-2">
              <h3 className="text-sm font-black font-sora text-zinc-950 dark:text-white uppercase tracking-widest">
                Business Snapshot
              </h3>
            </div>

            {/* Snapshot Card */}
            <Card className="border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] p-5 shadow-sm space-y-6">
              
              {/* Circular Gauge */}
              <div className="space-y-2">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-505 uppercase tracking-widest font-black block text-center">Business Health</span>
                <CompactHealthScoreCircle score={dashboardData?.digitalMaturity || 92} />
              </div>

              {/* Snapshot Stats Stack */}
              <div className="space-y-4 pt-4 border-t border-zinc-200/10 dark:border-zinc-900/10">
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-450 dark:text-zinc-500 font-medium font-body flex items-center gap-1"><Clock size={12} /> Today&apos;s Goal</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[120px]">Listing sync</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-450 dark:text-zinc-500 font-medium font-body flex items-center gap-1"><DollarSign size={12} /> Revenue</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">₹{(adv?.monthlySales || 50000).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-450 dark:text-zinc-500 font-medium font-body flex items-center gap-1"><TrendingUp size={12} /> Growth Score</span>
                  <span className="font-black text-blue-500">{dashboardData?.growthScore || 84}</span>
                </div>

                <div className="flex flex-col gap-1 text-xs pt-3 border-t border-zinc-200/10 dark:border-zinc-900/10">
                  <span className="text-zinc-450 dark:text-zinc-500 font-medium font-body flex items-center gap-1"><CheckCircle2 size={12} /> Recent Mission</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-300 leading-normal text-[11px]">
                    {dashboardData?.todaysMissions?.[0]?.title || "Trigger recovery campaigns"}
                  </span>
                </div>

              </div>
            </Card>
          </div>

        </div>

      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { getBusinessId } from "@/lib/api";
import { Mic, MicOff, Square, Volume2, VolumeX, History, Send, ArrowRight, Play } from "lucide-react";

interface VoiceHistoryItem {
  question: string;
  answerText: string;
  parsed: {
    summary: string;
    recommendations: string[];
    whyItMatters: string;
    nextBestAction: string;
  };
  timestamp: string;
}

const SUGGESTIONS = [
  "Explain my dashboard",
  "What should I focus on this week?",
  "Why did my business score decrease?",
  "Explain my Growth Missions",
  "Summarize my Insights",
  "Help me improve my Instagram",
  "How can I improve my SEO?",
  "What is Customer Analytics?",
];

export default function TalkPage() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState<VoiceHistoryItem["parsed"] | null>(null);
  const [currentRawText, setCurrentRawText] = useState("");
  const [history, setHistory] = useState<VoiceHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [thinkingMessage, setThinkingMessage] = useState("Understanding your request...");
  const [manualInput, setManualInput] = useState("");
  const [micError, setMicError] = useState<string | null>(null);


  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");

  // Load history from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexora_voice_history");
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load voice history:", e);
        }
      }
    }
  }, []);

  // Save history to localStorage (Memoized to prevent closures overhead)
  const saveToHistory = useCallback((item: VoiceHistoryItem, currentHistory: VoiceHistoryItem[]) => {
    const updated = [item, ...currentHistory].slice(0, 30);
    setHistory(updated);
    localStorage.setItem("nexora_voice_history", JSON.stringify(updated));
  }, []);

  // Thinking messages cycler
  useEffect(() => {
    if (status === "thinking") {
      const messages = [
        "Understanding your request...",
        "Retrieving business insights...",
        "Preparing recommendations...",
        "Orchestrating growth checklist..."
      ];
      let i = 0;
      thinkingTimer.current = setInterval(() => {
        i = (i + 1) % messages.length;
        setThinkingMessage(messages[i]);
      }, 2500);
    } else {
      if (thinkingTimer.current) {
        clearInterval(thinkingTimer.current);
      }
    }
    return () => {
      if (thinkingTimer.current) clearInterval(thinkingTimer.current);
    };
  }, [status]);

  // Clean speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Parse Markdown headers into specific UI sections (Memoized)
  const parseResponse = useCallback((text: string) => {
    const parts = {
      summary: "",
      recommendations: [] as string[],
      whyItMatters: "",
      nextBestAction: "",
    };

    const shortAnswerMatch = text.match(/### Short Answer\s*([\s\S]*?)(?=###|$)/i);
    const recommendedActionsMatch = text.match(/### Recommended Actions\s*([\s\S]*?)(?=###|$)/i);
    const keyTakeawayMatch = text.match(/### Key Takeaway\s*([\s\S]*?)(?=###|$)/i);

    if (shortAnswerMatch) {
      parts.summary = shortAnswerMatch[1].trim();
    } else {
      parts.summary = text.split("\n\n")[0] || text;
    }

    if (recommendedActionsMatch) {
      const rawRec = recommendedActionsMatch[1];
      const lines = rawRec.split("\n");
      const recList: string[] = [];
      let impact = "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
          recList.push(trimmed.replace(/^[•\-\*]\s*/, ""));
        } else if (trimmed.toLowerCase().includes("impact:")) {
          impact = trimmed.replace(/^.*\bimpact:\s*/i, "");
        }
      }
      parts.recommendations = recList;
      parts.whyItMatters = impact || "This action is recommended to optimize your growth velocity.";
    } else {
      parts.whyItMatters = "Recommended actions target your core sales channels.";
    }

    if (keyTakeawayMatch) {
      parts.nextBestAction = keyTakeawayMatch[1].trim();
    } else {
      const lines = text.split("\n");
      parts.nextBestAction = lines[lines.length - 1] || "Review your dashboard daily.";
    }

    return parts;
  }, []);

  // Speak AI output (Memoized)
  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    if (!soundEnabled) return;

    const parsed = parseResponse(text);
    const cleanSummary = parsed.summary.replace(/\s+/g, " ").trim();
    const sentences = cleanSummary.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanSummary];
    const speakableText = sentences.slice(0, 2).join("").trim() || cleanSummary;

    const utterance = new SpeechSynthesisUtterance(speakableText);
    utteranceRef.current = utterance;
    setStatus("speaking");

    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(
      (v) =>
        v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("US English")
    );
    if (premiumVoice) utterance.voice = premiumVoice;

    utterance.onend = () => {
      setStatus("idle");
    };

    utterance.onerror = () => {
      setStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  }, [soundEnabled, parseResponse]);

  // Trigger processing of voice transcription (Memoized)
  const processQuery = useCallback(async (queryText: string) => {
    if (!queryText.trim()) {
      setStatus("idle");
      return;
    }

    setStatus("thinking");
    const businessId = getBusinessId();

    try {
      const res = await api.post<{ message: { content: string }; aiCore?: any }>(
        "/api/chat/ask?useCore=true",
        {
          businessId,
          question: queryText,
          useCore: true,
        }
      );

      const responseText = res.message.content;
      setCurrentRawText(responseText);
      const parsed = parseResponse(responseText);
      setAiResponse(parsed);

      const historyItem: VoiceHistoryItem = {
        question: queryText,
        answerText: responseText,
        parsed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      saveToHistory(historyItem, history);

      if (soundEnabled) {
        speakText(responseText);
      } else {
        setStatus("idle");
      }
    } catch (e) {
      console.error("AI Core processing failed:", e);
      setStatus("idle");
    }
  }, [history, soundEnabled, parseResponse, speakText, saveToHistory]);

  // Toggle Microphone Stream (Memoized)
  const toggleListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try Google Chrome.");
      return;
    }

    if (status === "speaking") {
      window.speechSynthesis.cancel();
      setStatus("idle");
      return;
    }

    if (status === "listening") {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
      finalTranscriptRef.current = "";
      setAiResponse(null);
      setCurrentRawText("");
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
      const currentText = finalTranscript || interimTranscript;
      if (currentText) {
        setTranscript(currentText);
        finalTranscriptRef.current = currentText;
      }
    };


    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setMicError("Microphone access was denied. Please allow microphone permissions in your browser's address bar settings and try again.");
      } else if (event.error === "no-speech") {
        setMicError("No speech detected. Please speak clearly or check your microphone input levels.");
      } else if (event.error === "network") {
        setMicError("Speech recognition failed due to a network connection error.");
      } else {
        setMicError(`Speech detection failed (${event.error}). Please type your query below.`);
      }
      setStatus("idle");
    };


    recognition.onend = () => {
      const query = finalTranscriptRef.current;
      if (query) {
        setStatus("thinking");
        processQuery(query);
      } else {
        setStatus("idle");
      }
    };

    recognition.start();
  }, [status, processQuery]);

  // Manual suggestion click handler (Memoized)
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (status === "listening" || status === "thinking") return;
    setMicError(null);
    setTranscript(suggestion);
    finalTranscriptRef.current = suggestion;
    processQuery(suggestion);
  }, [status, processQuery]);

  // Manual typed input submit handler (Memoized)
  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || status === "thinking" || status === "listening") return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setMicError(null);
    setTranscript(manualInput);
    finalTranscriptRef.current = manualInput;
    processQuery(manualInput);
    setManualInput("");
  }, [manualInput, status, processQuery]);


  // Replay voice answers from history (Memoized)
  const loadHistoryItem = useCallback((item: VoiceHistoryItem) => {
    setTranscript(item.question);
    setAiResponse(item.parsed);
    setCurrentRawText(item.answerText);
    setHistoryOpen(false);
    speakText(item.answerText);
  }, [speakText]);

  return (
    <AppShell>
      {/* Waveform Keyframe styles tag */}
      <style>{`
        @keyframes voice-waveform {
          0%, 100% { height: 12px; }
          50% { height: 52px; }
        }
        .animate-waveform-bar {
          animation: voice-waveform 1.1s ease-in-out infinite;
        }
        @keyframes orb-glowing {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.35; }
        }
        .animate-orb-glow {
          animation: orb-glowing 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex flex-col min-h-[calc(100vh-8rem)] text-left">
        {/* Top bar controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Talk with Nexora</h1>
            <p className="text-xs text-zinc-500">Nexora Voice Business Assistant</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 transition-all flex items-center justify-center ${
                soundEnabled ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700" : "bg-transparent text-zinc-400"
              }`}
              title={soundEnabled ? "Mute Voice Out" : "Enable Voice Out"}
              type="button"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
              title="Recent Conversations"
              type="button"
            >
              <History size={18} />
              <span className="text-xs font-semibold hidden sm:inline">History</span>
            </button>
          </div>
        </div>

        {/* Central conversational view container */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 max-w-3xl mx-auto w-full">
          {/* State 1: Idle */}
          {status === "idle" && !aiResponse && (
            <div className="text-center flex flex-col items-center gap-6 animate-fade-in w-full">
              <div className="relative group">
                <div className="absolute inset-0 bg-zinc-900/10 dark:bg-zinc-50/10 rounded-full blur-2xl group-hover:bg-zinc-900/20 transition duration-300 animate-orb-glow" />
                <button
                  onClick={toggleListening}
                  className="relative w-24 h-24 rounded-full bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center shadow-premium transition-all duration-300 hover:scale-105 active:scale-95"
                  type="button"
                >
                  <Mic size={36} className="text-white dark:text-zinc-900" />
                </button>
              </div>
              <div className="space-y-1 mt-2">
                <h2 className="text-lg font-semibold">Talk with Nexora</h2>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  Ask anything about your business or Nexora. I&apos;ll analyze your data and guide you.
                </p>
              </div>

              {micError && (
                <div className="w-full max-w-md p-3.5 border border-red-500/20 bg-red-500/[0.02] rounded-md text-red-500 text-xs font-semibold leading-relaxed mt-2">
                  ⚠️ {micError}
                </div>
              )}

              {/* Suggestions Grid */}
              <div className="w-full mt-6 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Suggested queries</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSuggestionClick(item)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full transition-colors"
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* State 2: Listening */}
          {status === "listening" && (
            <div className="text-center flex flex-col items-center gap-8 w-full py-10">
              <div className="relative">
                <div className="absolute -inset-8 bg-red-500/10 rounded-full blur-2xl animate-ping opacity-75" />
                <div className="absolute -inset-4 bg-red-500/20 rounded-full blur-xl animate-orb-glow" />
                <button
                  onClick={toggleListening}
                  className="relative w-36 h-36 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl border-4 border-white/20 transition-transform duration-300 hover:scale-105 active:scale-95"
                  type="button"
                >
                  <MicOff size={48} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-bold tracking-widest text-red-500 uppercase animate-pulse">
                  🔴 Live Listening
                </span>
                <div className="flex items-center justify-center gap-2 h-12 mt-2">
                  <span className="w-1.5 bg-red-500 rounded-full animate-waveform-bar" style={{ height: "24px", animationDelay: "0.1s" }} />
                  <span className="w-1.5 bg-red-500 rounded-full animate-waveform-bar" style={{ height: "48px", animationDelay: "0.3s" }} />
                  <span className="w-1.5 bg-red-500 rounded-full animate-waveform-bar" style={{ height: "36px", animationDelay: "0.5s" }} />
                  <span className="w-1.5 bg-red-500 rounded-full animate-waveform-bar" style={{ height: "18px", animationDelay: "0.2s" }} />
                </div>
              </div>
              <div className="w-full max-w-2xl mt-4 px-8 py-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-inner min-h-[6rem] flex items-center justify-center">
                <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-lg italic text-center leading-relaxed">
                  {transcript || "Speak now, I'm listening..."}
                </p>
              </div>
            </div>
          )}

          {/* State 3: Thinking */}
          {status === "thinking" && (
            <div className="text-center flex flex-col items-center gap-6 w-full py-12">
              <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative">
                <div className="absolute inset-0 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                <Mic size={24} className="text-zinc-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold animate-pulse text-zinc-800 dark:text-zinc-200">{thinkingMessage}</p>
                {transcript && <p className="text-xs text-zinc-400 max-w-sm mx-auto italic truncate">“{transcript}”</p>}
              </div>
            </div>
          )}

          {/* State 4: Speaking / UI Responses */}
          {(status === "speaking" || aiResponse) && status !== "thinking" && status !== "listening" && (
            <div className="w-full flex flex-col gap-6 animate-fade-in text-left">
              {/* Transcript tag */}
              <div className="flex items-start gap-3 justify-end w-full">
                <div className="px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs max-w-[80%]">
                  <p className="font-semibold text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Your query</p>
                  <p className="italic font-medium text-zinc-800 dark:text-zinc-200">“{transcript}”</p>
                </div>
              </div>

              {/* Response Panel */}
              <div className="w-full rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-premium space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-bold text-white dark:text-zinc-900 text-sm shrink-0 shadow-premium ${status === "speaking" ? "animate-pulse" : ""}`}>
                      ✨
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-1.5">
                        Nexora <span className="pill bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold text-[9px] uppercase tracking-wider">AI Advisor</span>
                      </h3>
                      <p className="text-[10px] text-zinc-450">Grounded in your business data</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "speaking" ? (
                      <button
                        onClick={() => window.speechSynthesis.cancel()}
                        className="px-3 py-1.5 rounded-md bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-red-500 transition flex items-center gap-1.5"
                        type="button"
                      >
                        Stop Speaking
                      </button>
                    ) : (
                      currentRawText && (
                        <button
                          onClick={() => speakText(currentRawText)}
                          className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition flex items-center gap-1.5"
                          type="button"
                        >
                          Play Audio
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Structured Sections */}
                {aiResponse && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 rounded-md bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">Summary</h4>
                        <p className="text-xs leading-relaxed font-medium text-zinc-800 dark:text-zinc-200">{aiResponse.summary}</p>
                      </div>
                      <div className="p-4 rounded-md bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">Next Best Action</h4>
                        <p className="text-xs leading-relaxed font-semibold text-zinc-800 dark:text-zinc-200">{aiResponse.nextBestAction}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {aiResponse.recommendations.length > 0 && (
                        <div className="p-4 rounded-md bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2.5">Recommendations</h4>
                          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                            {aiResponse.recommendations.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-accent font-bold mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="p-4 rounded-md bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">Why This Matters</h4>
                        <p className="text-xs leading-relaxed font-medium text-zinc-650 dark:text-zinc-450">{aiResponse.whyItMatters}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset Trigger */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={toggleListening}
                    className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-premium"
                    title="Speak again"
                    type="button"
                  >
                    <Mic size={20} className="text-white dark:text-zinc-900" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Keyboard Input Fallback */}
        <div className="max-w-xl mx-auto w-full mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-800 pb-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <input
              type="text"
              placeholder="Or type your question here if mic fails..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              disabled={status === "thinking" || status === "listening"}
              className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-800 dark:text-zinc-200 px-4 py-2 placeholder-zinc-400"
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || status === "thinking" || status === "listening"}
              className="w-9 h-9 rounded-md bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
              title="Send question"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Floating Collapsible Sidebar for Voice History */}
        {historyOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => setHistoryOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col p-6 shadow-premium animate-slide-in text-left">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-accent" />
                  <h3 className="font-semibold text-sm">Voice History</h3>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1 rounded-md hover:bg-zinc-150 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                  type="button"
                >
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Scrollable conversation logs */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                    <History className="mx-auto mb-2 text-zinc-300 dark:text-zinc-800" size={32} />
                    <p className="text-xs">No voice conversations recorded.</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left p-3.5 rounded bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 hover:dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors flex flex-col gap-1.5"
                      type="button"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] text-accent uppercase font-bold tracking-wider">Voice Session</span>
                        <span className="text-[9px] text-zinc-400">{item.timestamp}</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">“{item.question}”</p>
                      <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{item.parsed.summary}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

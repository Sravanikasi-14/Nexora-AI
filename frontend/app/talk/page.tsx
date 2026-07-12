"use client";

import { useEffect, useState, useRef } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { getBusinessId } from "@/lib/api";
import { Mic, MicOff, Square, Volume2, VolumeX, History, Send, ArrowRight, Play, Check } from "lucide-react";

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

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Save history to localStorage
  const saveToHistory = (item: VoiceHistoryItem) => {
    const updated = [item, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem("nexora_voice_history", JSON.stringify(updated));
  };

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

  // Parse Markdown headers into specific UI sections
  const parseResponse = (text: string) => {
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
  };

  // Speak AI output
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    if (!soundEnabled) return;

    // Speak Summary + Takeaway to keep voice output natural and concise
    const parsed = parseResponse(text);
    const speakableText = `${parsed.summary}. ${parsed.nextBestAction}`;

    const utterance = new SpeechSynthesisUtterance(speakableText);
    utteranceRef.current = utterance;
    setStatus("speaking");

    // Match vocal styles
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
  };

  // Trigger processing of voice transcription
  const processQuery = async (queryText: string) => {
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
        }
      );

      const responseText = res.message.content;
      setCurrentRawText(responseText);
      const parsed = parseResponse(responseText);
      setAiResponse(parsed);

      // Save to local history
      const historyItem: VoiceHistoryItem = {
        question: queryText,
        answerText: responseText,
        parsed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      saveToHistory(historyItem);

      // Start text-to-speech output
      if (soundEnabled) {
        speakText(responseText);
      } else {
        setStatus("idle");
      }
    } catch (e) {
      console.error("AI Core processing failed:", e);
      setStatus("idle");
    }
  };

  // Toggle Microphone Stream
  const toggleListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try Google Chrome.");
      return;
    }

    // Stop speaking if active
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
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
      setAiResponse(null);
      setCurrentRawText("");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          setTranscript(event.results[i][0].transcript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setStatus("idle");
    };

    recognition.onend = () => {
      // Trigger API Core request once stream ends
      setStatus("thinking");
      setTranscript((prev) => {
        processQuery(prev);
        return prev;
      });
    };

    recognition.start();
  };

  // Manual suggestion click handler
  const handleSuggestionClick = (suggestion: string) => {
    if (status === "listening" || status === "thinking") return;
    setTranscript(suggestion);
    processQuery(suggestion);
  };

  // Replay voice answers from history
  const loadHistoryItem = (item: VoiceHistoryItem) => {
    setTranscript(item.question);
    setAiResponse(item.parsed);
    setCurrentRawText(item.answerText);
    setHistoryOpen(false);
    speakText(item.answerText);
  };

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

      <div className="relative flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Top bar controls */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Talk with Nexora</h1>
            <p className="text-sm text-muted">Nexora Voice Business Assistant</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border border-border transition-all flex items-center justify-center ${
                soundEnabled ? "bg-accent/10 text-accent border-accent/20" : "bg-surface hover:bg-surface2 text-muted"
              }`}
              title={soundEnabled ? "Mute Voice Out" : "Enable Voice Out"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface2 text-ink transition-all flex items-center justify-center gap-2"
              title="Recent Conversations"
            >
              <History size={20} />
              <span className="text-sm font-medium hidden sm:inline">History</span>
            </button>
          </div>
        </div>

        {/* Central conversational view container */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 max-w-3xl mx-auto w-full">
          {/* State 1: Idle (Mic + suggest chips) */}
          {status === "idle" && !aiResponse && (
            <div className="text-center flex flex-col items-center gap-6 animate-fade-in w-full">
              <div className="relative group">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/30 transition duration-300" />
                <button
                  onClick={toggleListening}
                  className="relative w-28 h-28 rounded-full bg-[#12161A] hover:bg-[#181F27] border border-white/10 hover:border-accent/30 flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <Mic size={42} className="text-accent" />
                </button>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-medium">Talk with Nexora</h2>
                <p className="text-sm text-muted max-w-md mx-auto">
                  Ask anything about your business or Nexora. I'll analyze your data and guide you.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="w-full mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted text-center">Suggested queries</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSuggestionClick(item)}
                      className="px-3.5 py-2 text-xs font-medium bg-[#12161A] hover:bg-[#181F27] border border-white/5 hover:border-white/20 rounded-full transition-all duration-200"
                      style={{ color: "#cbd5e1" }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* State 2: Listening (Pulsing microphone + live transcript) */}
          {status === "listening" && (
            <div className="text-center flex flex-col items-center gap-6 w-full">
              <div className="relative">
                <div className="absolute -inset-4 bg-accent/25 rounded-full blur-xl animate-orb-glow" />
                <button
                  onClick={toggleListening}
                  className="relative w-28 h-28 rounded-full bg-accent text-white flex items-center justify-center shadow-xl shadow-accent/20"
                >
                  <MicOff size={42} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-semibold tracking-wider text-accent uppercase animate-pulse">Listening...</span>
                {/* Waveform Bar simulation */}
                <div className="flex items-center justify-center gap-1.5 h-14 mt-2">
                  <span className="w-1.5 bg-accent rounded-full animate-waveform-bar" style={{ height: '16px', animationDelay: '0.1s' }} />
                  <span className="w-1.5 bg-accent rounded-full animate-waveform-bar" style={{ height: '36px', animationDelay: '0.3s' }} />
                  <span className="w-1.5 bg-accent rounded-full animate-waveform-bar" style={{ height: '48px', animationDelay: '0.5s' }} />
                  <span className="w-1.5 bg-accent rounded-full animate-waveform-bar" style={{ height: '24px', animationDelay: '0.2s' }} />
                  <span className="w-1.5 bg-accent rounded-full animate-waveform-bar" style={{ height: '12px', animationDelay: '0.4s' }} />
                </div>
              </div>
              <div className="w-full max-w-lg mt-4 px-6 py-4 rounded-2xl bg-surface border border-border shadow-inner min-h-[4rem] flex items-center justify-center">
                <p className="text-ink font-medium italic text-center">
                  {transcript || "Speak now..."}
                </p>
              </div>
            </div>
          )}

          {/* State 3: Thinking (Retrieve database/AI facts) */}
          {status === "thinking" && (
            <div className="text-center flex flex-col items-center gap-6 w-full">
              <div className="w-20 h-20 rounded-full bg-[#12161A] border border-border flex items-center justify-center relative">
                <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <div className="w-12 h-12 rounded-full bg-base flex items-center justify-center">
                  <Mic size={24} className="text-muted" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium animate-pulse text-accent">{thinkingMessage}</p>
                {transcript && <p className="text-xs text-muted max-w-sm mx-auto italic truncate">"{transcript}"</p>}
              </div>
            </div>
          )}

          {/* State 4: Speaking or displaying AI Responses */}
          {(status === "speaking" || aiResponse) && status !== "thinking" && status !== "listening" && (
            <div className="w-full flex flex-col gap-6 animate-fade-in">
              {/* Transcript tag */}
              <div className="flex items-start gap-3 justify-end w-full">
                <div className="px-4 py-2.5 rounded-2xl bg-[#12161A] border border-white/5 text-sm max-w-[80%]" style={{ color: "#cbd5e1" }}>
                  <p className="font-semibold text-xs text-accent uppercase tracking-wider mb-1">Your query</p>
                  <p className="italic">"{transcript}"</p>
                </div>
              </div>

              {/* Response Panel */}
              <div className="w-full rounded-2xl bg-surface border border-border p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center ${status === 'speaking' ? 'animate-pulse' : ''}`}>
                      <Mic size={20} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Nexora</h3>
                      <p className="text-xs text-muted">AI Business Advisor</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "speaking" ? (
                      <button
                        onClick={() => window.speechSynthesis.cancel()}
                        className="px-3.5 py-1.5 rounded-lg bg-[#12161A] hover:bg-[#181F27] border border-white/5 text-xs font-semibold text-accent transition flex items-center gap-1.5"
                      >
                        <Square size={12} fill="currentColor" /> Stop Speaking
                      </button>
                    ) : (
                      currentRawText && (
                        <button
                          onClick={() => speakText(currentRawText)}
                          className="px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Play size={12} fill="currentColor" /> Play Audio
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Structured Sections */}
                {aiResponse && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left block (Summary & Next Action) */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-[#12161A] border border-white/5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">Summary</h4>
                        <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>{aiResponse.summary}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#12161A] border border-white/5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">Next Best Action</h4>
                        <p className="text-sm leading-relaxed font-semibold" style={{ color: "#cbd5e1" }}>{aiResponse.nextBestAction}</p>
                      </div>
                    </div>

                    {/* Right block (Recommendations & Context reasoning) */}
                    <div className="space-y-4">
                      {aiResponse.recommendations.length > 0 && (
                        <div className="p-4 rounded-xl bg-[#12161A] border border-white/5">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-accent mb-2.5">Recommendations</h4>
                          <ul className="space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
                            {aiResponse.recommendations.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-accent font-bold mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="p-4 rounded-xl bg-[#12161A] border border-white/5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">Why This Matters</h4>
                        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{aiResponse.whyItMatters}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset Trigger */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={toggleListening}
                    className="w-14 h-14 rounded-full bg-accent hover:bg-accent/90 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    title="Speak again"
                  >
                    <Mic size={24} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Collapsible Sidebar for Voice History */}
        {historyOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setHistoryOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 w-80 bg-surface border-l border-border z-50 flex flex-col p-6 shadow-2xl transition-transform duration-300 animate-slide-in">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <History size={20} className="text-accent" />
                  <h3 className="font-semibold text-lg">Voice History</h3>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1 rounded-lg hover:bg-surface2 text-muted"
                >
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Scrollable conversation logs */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="mx-auto text-muted mb-2" size={32} />
                    <p className="text-sm text-muted">No voice conversations recorded.</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left p-3.5 rounded-xl bg-[#12161A] hover:bg-[#181F27] border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-accent uppercase font-bold tracking-wider">Voice Session</span>
                        <span className="text-[10px] text-muted">{item.timestamp}</span>
                      </div>
                      <p className="text-sm font-semibold line-clamp-1" style={{ color: "#e2e8f0" }}>"{item.question}"</p>
                      <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "#9ca3af" }}>{item.parsed.summary}</p>
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

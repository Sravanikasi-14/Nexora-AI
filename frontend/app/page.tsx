"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Sparkles,
  Globe,
  Users,
  Target,
  ChevronRight,
  Play,
  ArrowRight,
  CheckCircle2,
  Database,
  Cpu,
  ListTodo,
  Volume2,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  TrendingDown,
  ArrowUpRight
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip
} from "recharts";
import { Button } from "@/components/ui/button";

// ScrollReveal helper using framer-motion viewport checks
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Typeloop component for hero text rotation
function TypingLoop({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [text, setText] = useState("");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setText(phrases[phrases.length - 1]);
      return;
    }

    if (subIndex === phrases[index].length + 1 && !reverse) {
      const timeout = setTimeout(() => setReverse(true), 2500);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [subIndex, reverse, index, phrases, shouldReduceMotion]);

  useEffect(() => {
    if (!shouldReduceMotion) {
      setText(phrases[index].substring(0, subIndex));
    }
  }, [subIndex, index, phrases, shouldReduceMotion]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-8">
      <span className="text-zinc-400 dark:text-zinc-400 font-mono text-sm sm:text-base md:text-lg tracking-tight font-medium">
        {text}
      </span>
      {!shouldReduceMotion && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="w-1.5 h-4.5 bg-accent rounded-full inline-block"
        />
      )}
    </div>
  );
}

// Pipeline flows connector
function PipelineConnector() {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) {
    return <div className="h-0.5 bg-zinc-800 flex-1 min-w-[20px]" />;
  }

  return (
    <div className="relative flex-1 min-w-[30px] h-0.5 bg-zinc-850 dark:bg-zinc-850 overflow-hidden">
      <motion.div
        initial={{ left: "-100%" }}
        animate={{ left: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
      />
    </div>
  );
}

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. Navigation scroll state listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Mouse position tracker for reactive backlighting spotlight
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 3. 3D Tilt Preview Card calculations
  const previewRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMouseMoveTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current || shouldReduceMotion) return;
    const rect = previewRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    const rx = -(mouseY / height) * 8; // Max tilt degrees
    const ry = (mouseX / width) * 8;
    setTilt({ rx, ry });
  };

  const handleMouseLeaveTilt = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  // 4. Interactive Mission showcase selector
  const [selectedChannel, setSelectedChannel] = useState("customers");
  const CHANNELS = [
    {
      id: "customers",
      label: "Customer Outreach",
      icon: Users,
      headline: "Draft personal thank-yous for high-value VIPs",
      mission: "Acknowledge Jane Doe (spent ₹4,500 this month, active 3 years)",
      suggestedText: "Hey Jane, thank you for supporting us for over 3 years. We appreciate your loyalty. Here's a custom discount code for your next visit!",
      accent: "border-l-indigo-500 text-indigo-400"
    },
    {
      id: "seo",
      label: "Local Search SEO",
      icon: Globe,
      headline: "Correct Google Business Name consistency",
      mission: "Adjust listing spelling matching your official invoice headers",
      suggestedText: "Updating search keyword maps to: Coastal Coffee Co. & Roastery",
      accent: "border-l-blue-500 text-blue-400"
    },
    {
      id: "retention",
      label: "Recovery Campaigns",
      icon: Target,
      headline: "Re-engage cold segment contacts",
      mission: "Recover ₹18,200 from 26 customers inactive > 60 days",
      suggestedText: "Hi [First Name], it's been a while since your last order. Enjoy 15% off this week! Code: WE_MISS_YOU",
      accent: "border-l-emerald-500 text-emerald-400"
    }
  ];

  // 5. Customer Analytics Mini chart simulation
  const analyticsData = [
    { date: "Mon", sales: 1200, retention: 85 },
    { date: "Tue", sales: 1800, retention: 87 },
    { date: "Wed", sales: 1500, retention: 91 },
    { date: "Thu", sales: 2600, retention: 94 },
    { date: "Fri", sales: 2400, retention: 95 },
    { date: "Sat", sales: 3400, retention: 97 },
    { date: "Sun", sales: 3100, retention: 99 },
  ];

  const currentChannelDetails = CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];

  return (
    <div className="dark min-h-screen bg-[#030303] text-[#F4F4F5] relative overflow-x-hidden selection:bg-accent/30 selection:text-white font-sans">
      
      {/* Pointer Spotlight backlighting layer */}
      {!shouldReduceMotion && (
        <div
          className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-25"
          style={{
            background: `radial-gradient(750px at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.15), transparent 80%)`,
          }}
        />
      )}

      {/* Subtle Grid Dots layer */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none z-0 opacity-40" />

      {/* Floating Animated Mesh blobs */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <svg className="absolute w-[800px] h-[800px] top-[-25%] left-[-20%] opacity-20 blur-[130px]" viewBox="0 0 100 100">
            <motion.circle
              cx="50"
              cy="50"
              r="30"
              fill="url(#mesh-glow-1)"
              animate={{
                cx: [30, 60, 45, 30],
                cy: [35, 55, 30, 35],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <defs>
              <radialGradient id="mesh-glow-1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          <svg className="absolute w-[900px] h-[900px] top-[15%] right-[-25%] opacity-15 blur-[140px]" viewBox="0 0 100 100">
            <motion.circle
              cx="50"
              cy="50"
              r="35"
              fill="url(#mesh-glow-2)"
              animate={{
                cx: [70, 40, 60, 70],
                cy: [45, 65, 35, 45],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <defs>
              <radialGradient id="mesh-glow-2">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Floating Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#030303]/80 backdrop-blur-md border-b border-zinc-900 py-3 shadow-lg"
            : "bg-transparent py-5 border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-display font-bold text-white dark:text-zinc-900 text-sm shadow">
              N
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white group-hover:text-accent transition duration-300">
              Nexora
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#why" className="text-xs hover:text-white transition duration-300 relative group py-1 text-zinc-400 font-bold uppercase tracking-wider">
              Failures
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#engine" className="text-xs hover:text-white transition duration-300 relative group py-1 text-zinc-400 font-bold uppercase tracking-wider">
              Thinking
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#showcase" className="text-xs hover:text-white transition duration-300 relative group py-1 text-zinc-400 font-bold uppercase tracking-wider">
              Missions
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#analytics" className="text-xs hover:text-white transition duration-300 relative group py-1 text-zinc-400 font-bold uppercase tracking-wider">
              Analytics
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition duration-300 text-zinc-400"
            >
              Sign In
            </Link>
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
              <Link href="/register" className="btn-primary text-xs px-4 py-2 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition duration-300 hover:shadow-premium font-semibold">
                Start Free Scan
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center items-center pt-24 pb-16 z-10 px-6">
        <motion.div
          initial={shouldReduceMotion ? {} : "hidden"}
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="relative max-w-4xl mx-auto text-center flex flex-col items-center select-none"
        >
          {/* Conversational Pill Tag */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 }
            }}
            className="mb-8"
          >
            <span className="bg-[#12161A]/80 border border-zinc-800 text-accent font-bold px-4 py-1.5 rounded-full text-[10px] tracking-wider uppercase shadow-md backdrop-blur-md">
              ✨ Meets your new AI Chief Growth Officer
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-8 text-white max-w-3xl"
          >
            Your Business Has Data.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-indigo-400 to-[#10b981]">
              Now It Has Intelligence.
            </span>
          </motion.h1>

          {/* Typing Conversational loop */}
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 }
            }}
            className="mb-10 min-h-[32px] flex items-center justify-center"
          >
            <TypingLoop
              phrases={[
                "I found ₹18,200 waiting to be recovered.",
                "I discovered 3 growth opportunities.",
                "Let's grow your business."
              ]}
            />
          </motion.div>

          {/* Call to Actions */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 }
            }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.03 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/register"
                className="btn-primary text-xs px-8 py-3.5 w-full sm:w-auto flex items-center justify-center gap-2 group shadow-xl shadow-accent/20 hover:shadow-accent/40 transition duration-300 hover:shadow-premium font-semibold"
              >
                Become My AI Growth Officer
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.03 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 text-[#F4F4F5] hover:bg-[#12161A] text-xs font-semibold px-8 py-3.5 w-full sm:w-auto transition duration-300 shadow-md"
              >
                <Play size={12} className="mr-2 text-accent" />
                Watch Live Demo
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 3D perspective floating Dashboard preview widget */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="w-full max-w-4xl mx-auto mt-16 px-4"
        >
          <div
            ref={previewRef}
            onMouseMove={handleMouseMoveTilt}
            onMouseLeave={handleMouseLeaveTilt}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: shouldReduceMotion ? "none" : "transform 0.1s ease-out",
            }}
            className="border border-zinc-850 dark:border-zinc-850 rounded-2xl shadow-glow overflow-hidden bg-zinc-950/80 backdrop-blur-md p-6 select-none relative group"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-accent/10 transition-all duration-300" />
            
            {/* Mock Dashboard header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-2">Nexora Executive AI Desktop</span>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Live Engine</span>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Dial Column */}
              <div className="md:col-span-2 bg-[#090b0d] border border-zinc-900/60 rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute -inset-10 bg-radial-accent pointer-events-none opacity-40 blur-xl" />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 z-10">Business Growth Score</p>
                <div className="relative w-36 h-36 flex items-center justify-center mb-2 z-10">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#12161a" strokeWidth="8" fill="transparent" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#dial-grad)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="251"
                      initial={{ strokeDashoffset: 251 }}
                      animate={{ strokeDashoffset: 58 }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                    />
                    <defs>
                      <linearGradient id="dial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold text-white">77</span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Excellent</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium text-center max-w-sm mt-1 z-10">
                  "I found a high concentrations of inactive VIP buyers. Reach them to push score to 85."
                </p>
              </div>

              {/* Suggestions Column */}
              <div className="flex flex-col gap-4">
                <div className="bg-[#090b0d] border border-zinc-900/60 rounded-xl p-4 flex-1 text-left relative overflow-hidden border-l-4 border-l-indigo-500">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1">VIP Action Trigger</p>
                  <p className="font-bold text-xs text-white leading-tight">Send VIP Reward Outreach</p>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">Recover up to ₹4,500 by reward messaging top 4 regular accounts.</p>
                </div>

                <div className="bg-[#090b0d] border border-zinc-900/60 rounded-xl p-4 flex-1 text-left relative overflow-hidden border-l-4 border-l-emerald-500">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Inactive Customers Campaign</p>
                  <p className="font-bold text-xs text-white leading-tight">Re-engage 26 inactive accounts</p>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">Potential ₹18,200 in return purchases with custom code incentive.</p>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* Storytelling Section 1: Why businesses fail */}
      <section id="why" className="relative max-w-5xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80">
        <ScrollReveal className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-red-500 uppercase">The Problem</span>
          <h2 className="font-display text-3xl md:text-5xl font-black mt-2 text-white tracking-tight">
            Why business growth stalls.
          </h2>
          <p className="text-xs md:text-sm max-w-xl mx-auto mt-4 leading-relaxed text-zinc-400">
            Most owners aren't lazy. They just don't have time to write database queries, analyze page load speeds, and draft hundreds of emails.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Failure Card (Messy Analytics) */}
          <ScrollReveal delay={0.1}>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -3 }}
              className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-8 h-full flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="font-display font-extrabold text-lg text-white mb-2">Traditional Analytics Dashboards</h3>
                <p className="text-xs text-zinc-500 leading-relaxed mb-6 font-medium">
                  Confusing raw graphs, charts with unexplained terms, lists of logs, and thousands of metrics. They tell you what happened, but leave you to figure out what to do about it.
                </p>

                {/* Simulated Messy logs */}
                <div className="bg-[#050608] border border-zinc-900/80 rounded-lg p-4 font-mono text-[9px] text-red-400 space-y-1.5 text-left select-none">
                  <p>⚠️ CRITICAL: bounce_rate increased by 4.2% [ID: 8092]</p>
                  <p>⚠️ INFO: SQL query runtime took 840ms on users segments</p>
                  <p>⚠️ WARN: LCP exceeded limits on index checkout path</p>
                  <p className="text-zinc-650">System state: WAITING_FOR_ROOT_ACTION_MANUAL_INTERRUPT</p>
                </div>
              </div>
              <span className="text-[10px] text-red-500/70 font-bold uppercase tracking-wider block mt-6 text-left">Result: Paralyzing tech overhead</span>
            </motion.div>
          </ScrollReveal>

          {/* Success Card (Nexora Intelligence) */}
          <ScrollReveal delay={0.2}>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -3 }}
              className="bg-gradient-to-r from-accent/5 to-indigo-500/[0.02] border border-accent/20 rounded-xl p-8 h-full flex flex-col justify-between relative overflow-hidden group shadow-premium"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6 shadow-inner">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-display font-extrabold text-lg text-white mb-2">The Nexora Intelligence</h3>
                <p className="text-xs text-zinc-450 leading-relaxed mb-6 font-medium">
                  We summarize your business facts in simple checklists, state exactly what cash you are losing, draft outreach campaigns for your approval, and help you send them instantly.
                </p>

                {/* Simulated Clean checklist */}
                <div className="bg-[#07090d]/80 border border-accent/10 rounded-lg p-4 space-y-3 text-left">
                  <div className="flex items-center gap-2.5 text-[10px] text-zinc-300 font-semibold">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-mono">✓</span>
                    <span>VIP Customer reward drafted</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px] text-zinc-300 font-semibold">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-mono">✓</span>
                    <span>Local listings inconsistencies scanned</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px] text-zinc-300 font-semibold">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center font-mono">•</span>
                    <span>26 inactive customers selected</span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-accent font-bold uppercase tracking-wider block mt-6 text-left">Result: Simple, continuous sales growth</span>
            </motion.div>
          </ScrollReveal>

        </div>
      </section>

      {/* Storytelling Section 2: How Nexora thinks */}
      <section id="engine" className="relative max-w-5xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80">
        <ScrollReveal className="text-center mb-20">
          <span className="text-xs font-bold tracking-widest text-accent uppercase">How it Works</span>
          <h2 className="font-display text-3xl md:text-5xl font-black mt-2 text-white tracking-tight">
            How Nexora thinks.
          </h2>
          <p className="text-xs md:text-sm max-w-xl mx-auto mt-4 leading-relaxed text-zinc-400">
            We bypass complicated dashboards to turn raw business data directly into sales.
          </p>
        </ScrollReveal>

        {/* Dynamic Pipeline flows */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto relative px-4">
          
          {/* Node 1 */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-center flex flex-col items-center w-48 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Database size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">Business Data</h4>
            <p className="text-[9px] text-zinc-500 mt-1 font-medium">Customer logs, digital profiles, Google Business maps.</p>
          </div>

          <PipelineConnector />

          {/* Node 2 */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-center flex flex-col items-center w-48 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Cpu size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">AI Core Scan</h4>
            <p className="text-[9px] text-zinc-500 mt-1 font-medium">Our intelligence inspects metrics to discover opportunities.</p>
          </div>

          <PipelineConnector />

          {/* Node 3 */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-center flex flex-col items-center w-48 shadow-sm border-l-4 border-l-[var(--warn)]">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
              <ListTodo size={16} />
            </div>
            <h4 className="text-xs font-bold text-white">Missions List</h4>
            <p className="text-[9px] text-zinc-500 mt-1 font-medium">You get a plain English checklist of the single best next actions.</p>
          </div>

          <PipelineConnector />

          {/* Node 4 */}
          <div className="bg-gradient-to-br from-zinc-950 to-emerald-950/20 border border-emerald-900/50 rounded-xl p-5 text-center flex flex-col items-center w-48 shadow-premium">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
              <TrendingUp size={16} />
            </div>
            <h4 className="text-xs font-bold text-emerald-400">Growth</h4>
            <p className="text-[9px] text-zinc-400 mt-1 font-medium">VIP incentives sent out, search listings optimized, sales rise.</p>
          </div>

        </div>
      </section>

      {/* Storytelling Section 3: Interactive mission showcase */}
      <section id="showcase" className="relative max-w-5xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80">
        <ScrollReveal className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-accent uppercase">Interactive Demo</span>
          <h2 className="font-display text-3xl md:text-5xl font-black mt-2 text-white tracking-tight">
            See your daily missions.
          </h2>
          <p className="text-xs md:text-sm max-w-xl mx-auto mt-4 leading-relaxed text-zinc-400">
            Click different channels to preview how Nexora translates business data into clear draft campaigns.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Navigation selectors */}
          <div className="flex flex-col gap-3 justify-center">
            {CHANNELS.map((chan) => {
              const ChannelIcon = chan.icon;
              const isSelected = selectedChannel === chan.id;
              return (
                <motion.button
                  key={chan.id}
                  whileHover={shouldReduceMotion ? {} : { x: 4 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  onClick={() => setSelectedChannel(chan.id)}
                  className={`text-left p-4 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                    isSelected
                      ? "bg-[#12161A]/85 border-zinc-800 text-white shadow-md shadow-accent/5"
                      : "bg-zinc-950/20 border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-accent/10 text-accent" : "bg-zinc-900 text-zinc-500"}`}>
                    <ChannelIcon size={16} />
                  </div>
                  <span className="text-xs font-bold tracking-tight">{chan.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Interactive display card */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedChannel}
                initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className={`bg-zinc-950/90 border border-zinc-850 dark:border-zinc-850 rounded-xl p-6 shadow-glow border-l-4 ${currentChannelDetails.accent} text-left`}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Simulated Mission</p>
                <h3 className="font-display font-extrabold text-base text-white mb-1">{currentChannelDetails.headline}</h3>
                <p className="text-xs text-zinc-400 font-semibold mb-4 leading-normal">{currentChannelDetails.mission}</p>
                
                <div className="bg-[#050608] border border-zinc-900 rounded-lg p-4 font-mono text-xs text-zinc-300 text-left mb-6 leading-relaxed relative">
                  <p>{currentChannelDetails.suggestedText}</p>
                  <span className="absolute bottom-2 right-2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest font-sans">Draft copy</span>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                    <Link href="/register">
                      <Button size="sm" className="shadow-md hover:shadow-premium text-[11px] h-8 font-semibold">
                        Approve & Send Campaign
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </section>

      {/* Storytelling Section 4: Customer analytics visualization */}
      <section id="analytics" className="relative max-w-5xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <ScrollReveal className="text-left">
            <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Sales Visualization</span>
            <h2 className="font-display text-3xl md:text-5xl font-black mt-2 text-white tracking-tight leading-tight">
              Honest reads on customer trends.
            </h2>
            <p className="text-xs md:text-sm max-w-xl mx-auto mt-4 leading-relaxed text-zinc-400 font-medium">
              See cohort metrics, daily revenue averages, and digital presence checks automatically calculated from the tools you connect. No complicated spreadsheet formulas required.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button variant="outline" className="text-xs font-semibold h-9 shadow-sm hover:shadow-premium text-white border-zinc-800 hover:bg-zinc-900">
                  Analyze My Data
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="bg-[#090b0d]/80 border border-zinc-850 dark:border-zinc-850 rounded-xl p-5 shadow-premium text-left">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Weekly Revenue Analytics</p>
                  <p className="font-black text-xl text-white mt-1">₹17,800 <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 ml-1.5 inline-flex items-center gap-0.5"><ArrowUpRight size={10} /> +12%</span></p>
                </div>
                <span className="text-[8px] bg-zinc-900 text-zinc-500 font-bold px-2 py-0.5 rounded border border-zinc-800">VIP SEGMENT</span>
              </div>

              {/* Responsive Container for Recharts */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#090b0d", borderColor: "#27272a" }} labelStyle={{ color: "#fff", fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#4f46e5"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      isAnimationActive={!shouldReduceMotion}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Storytelling Section 5: Voice AI preview */}
      <section className="relative max-w-5xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <ScrollReveal delay={0.2} className="order-2 lg:order-1">
            <div className="bg-[#090b0d]/80 border border-zinc-850 dark:border-zinc-850 rounded-xl p-6 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Soundwaves display */}
              <div className="flex items-center justify-center gap-1.5 h-16 mb-6">
                {[...Array(9)].map((_, i) => {
                  const heights = [16, 28, 44, 20, 36, 12, 40, 24, 16];
                  return (
                    <motion.div
                      key={i}
                      animate={shouldReduceMotion ? {} : {
                        height: [heights[i], heights[i] * 0.4, heights[i] * 1.3, heights[i]]
                      }}
                      transition={{
                        duration: 1.2 + i * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-1.5 bg-accent rounded-full"
                      style={{ height: heights[i] }}
                    />
                  );
                })}
              </div>

              {/* Conversational transcript mockup */}
              <div className="space-y-4 text-left">
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[9px] font-bold font-display shrink-0 mt-0.5">N</div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">Nexora CGO</p>
                    <p className="text-xs text-zinc-300 font-semibold mt-1">"I noticed a drop in your repeat orders yesterday afternoon. Should I draft a flash loyalty discount message to send to regular customers?"</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end text-right">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider leading-none">Owner (You)</p>
                    <p className="text-xs text-zinc-400 font-semibold mt-1 bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg inline-block text-left max-w-xs">"Yes, draft it and send me a copy."</p>
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>

          <ScrollReveal className="text-left order-1 lg:order-2">
            <span className="text-xs font-bold tracking-widest text-accent uppercase">Voice Assistant Preview</span>
            <h2 className="font-display text-3xl md:text-5xl font-black mt-2 text-white tracking-tight leading-tight">
              A CGO that actually listens.
            </h2>
            <p className="text-xs md:text-sm max-w-xl mx-auto mt-4 leading-relaxed text-zinc-400 font-medium">
              No need to configure visual settings or write complex copy lines. Talk to your Growth Officer directly in plain voice prompts. Ask about metrics, request copy variations, and dispatch campaigns hands-free.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
              </span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Voice Beta active</span>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Storytelling Section 6: Testimonials */}
      <section className="relative max-w-5xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80">
        <ScrollReveal className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Success Stories</span>
          <h2 className="font-display text-3xl md:text-5xl font-black mt-2 text-white tracking-tight">
            Loved by small businesses.
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "Sarah Patel",
              business: "Owner, Green Leaves Nursery",
              growth: "+24% sales growth",
              quote: "“I had zero time for marketing or database lists. Nexora found VIP customers who hadn't bought in months, drafted a simple text, and boosted my weekend sales immediately.”"
            },
            {
              name: "Anand Verma",
              business: "Director, Urban Pizza Co.",
              growth: "₹42,500 recovered",
              quote: "“The suggestions lists are amazingly simple. No charts or confusion, just direct next steps. I fixed spelling mismatches on my local maps and recovered cold VIP cohorts easily.”"
            },
            {
              name: "Elena Rostova",
              business: "Founder, Bloom Salon & Spa",
              growth: "+18% client return rate",
              quote: "“I love the voice prompt assistant. I can simply review and approve drafted messages on my phone between client appointments. It really is like having a digital Chief Growth Officer.”"
            }
          ].map((t, idx) => (
            <ScrollReveal key={t.name} delay={shouldReduceMotion ? 0 : idx * 0.05}>
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -3 }}
                className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-6 h-full flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">{t.growth}</span>
                    <span className="text-zinc-650 text-xs">★★★★★</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-semibold italic">{t.quote}</p>
                </div>
                <div className="mt-6 border-t border-zinc-900/60 pt-4">
                  <p className="text-xs font-bold text-white leading-none">{t.name}</p>
                  <p className="text-[10px] text-zinc-600 font-semibold mt-1">{t.business}</p>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Storytelling Section 7: Final CTA */}
      <section className="relative max-w-4xl mx-auto px-6 py-28 z-10 border-t border-zinc-900/80 text-center">
        <ScrollReveal>
          <div className="relative overflow-hidden bg-gradient-to-b from-[#0e0e11] to-[#040405] border border-zinc-850 dark:border-zinc-850 rounded-2xl p-10 md:p-14 shadow-glow">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
            
            <span className="text-xs font-bold tracking-widest text-accent uppercase">Let's grow your business</span>
            <h2 className="font-display text-3xl md:text-5xl font-black mt-3 mb-6 text-white tracking-tight leading-tight">
              Ready to meet your CGO?
            </h2>
            <p className="text-xs md:text-sm max-w-md mx-auto text-zinc-450 leading-relaxed mb-8 font-medium">
              Connect your first data files in under 3 minutes. Zero tech setup required, completely secure.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
                <Link href="/register" className="btn-primary text-xs px-8 py-3.5 w-full sm:w-auto flex items-center justify-center shadow-xl shadow-accent/25 font-semibold">
                  Get Started Free
                </Link>
              </motion.div>
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
                <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-[#F4F4F5] hover:bg-[#12161A] text-xs font-semibold px-8 py-3.5 w-full sm:w-auto transition duration-300">
                  Speak with Support
                </Link>
              </motion.div>
            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#030303] py-14 relative z-10 text-left">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white shadow">
              N
            </div>
            <span className="font-display font-bold text-base text-white">Nexora</span>
          </div>

          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <a href="#why" className="hover:text-white transition duration-300">Failures</a>
            <a href="#engine" className="hover:text-white transition duration-300">Thinking</a>
            <a href="#showcase" className="hover:text-white transition duration-300">Missions</a>
            <Link href="/login" className="hover:text-white transition duration-300">Sign In</Link>
            <Link href="/register" className="hover:text-white transition duration-300">Register</Link>
          </div>

          <p className="text-[10px] text-zinc-600 font-semibold text-center md:text-right">
            © {new Date().getFullYear()} Nexora. Built by senior product designers for clear business intelligence.
          </p>
        </div>
      </footer>

    </div>
  );
}

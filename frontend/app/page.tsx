"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

// ScrollReveal Component using framer-motion for smooth viewport animations
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Orbit Node Configuration (12 total nodes)
interface OrbitNodeProps {
  name: string;
  angle: number;
  icon: React.ReactNode;
}

const ORBIT_NODES_INNER: OrbitNodeProps[] = [
  {
    name: "AI Growth Engine",
    angle: 0,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0z" />
      </svg>
    ),
  },
  {
    name: "Website Scanner",
    angle: 90,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    name: "Search Checker",
    angle: 180,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    name: "Business Numbers",
    angle: 270,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const ORBIT_NODES_MIDDLE: OrbitNodeProps[] = [
  {
    name: "Social Posts",
    angle: 45,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    name: "Customer Reviews",
    angle: 135,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.243.577 1.833l-3.966 2.884a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.966-2.884a1 1 0 00-1.175 0l-3.966 2.884c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 9.72c-.783-.57-.38-1.833.577-1.833h4.907a1 1 0 00.95-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    name: "Email Drafts",
    angle: 225,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "Customer Outreach",
    angle: 315,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
];

const ORBIT_NODES_OUTER: OrbitNodeProps[] = [
  {
    name: "Smart Workflows",
    angle: 15,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Strategy Chat",
    angle: 105,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: "Growth Score",
    angle: 195,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: "Clear Trends",
    angle: 285,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: "1. Connect",
    desc: "Connect your digital tools or load your customer files in one click. No coding needed.",
    icon: (
      <svg className="w-6 h-6 text-accent group-hover:rotate-[12deg] transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "2. Scan",
    desc: "We look at how customers find you, how fast your website is, and what they say about you.",
    icon: (
      <svg className="w-6 h-6 text-accent group-hover:rotate-[12deg] transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    title: "3. Guide",
    desc: "Get a clear, simple list of the most important things to do next to grow your business.",
    icon: (
      <svg className="w-6 h-6 text-accent group-hover:rotate-[12deg] transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "4. Create",
    desc: "We write your messages, email drafts, and posts. You just read, approve, and send.",
    icon: (
      <svg className="w-6 h-6 text-accent group-hover:rotate-[12deg] transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // 1. Navigation scroll state listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Adaptive Responsive Dimensions
  const [dimensions, setDimensions] = useState({ inner: 340, middle: 480, outer: 620 });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDimensions({ inner: 160, middle: 0, outer: 0 });
      } else if (width < 1024) {
        setDimensions({ inner: 240, middle: 340, outer: 0 });
      } else {
        setDimensions({ inner: 340, middle: 480, outer: 620 });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 3. Solar Orbit scroll-bound system
  const innerNodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const middleNodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outerNodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const targetAngle = useRef(0);
  const currentAngle = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      targetAngle.current = window.scrollY * 0.12;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    targetAngle.current = window.scrollY * 0.12;

    let rafId: number;
    const update = () => {
      currentAngle.current += (targetAngle.current - currentAngle.current) * 0.08;

      if (dimensions.inner > 0) {
        ORBIT_NODES_INNER.forEach((node, i) => {
          const el = innerNodeRefs.current[i];
          if (el) {
            const currentAngleDeg = (node.angle + currentAngle.current * 0.5) % 360;
            el.style.transform = `rotate(${currentAngleDeg}deg) translate(${dimensions.inner}px) rotate(-${currentAngleDeg}deg)`;
          }
        });
      }

      if (dimensions.middle > 0) {
        ORBIT_NODES_MIDDLE.forEach((node, i) => {
          const el = middleNodeRefs.current[i];
          if (el) {
            const currentAngleDeg = (node.angle - currentAngle.current * 0.35) % 360;
            el.style.transform = `rotate(${currentAngleDeg}deg) translate(${dimensions.middle}px) rotate(-${currentAngleDeg}deg)`;
          }
        });
      }

      if (dimensions.outer > 0) {
        ORBIT_NODES_OUTER.forEach((node, i) => {
          const el = outerNodeRefs.current[i];
          if (el) {
            const currentAngleDeg = (node.angle + currentAngle.current * 0.2) % 360;
            el.style.transform = `rotate(${currentAngleDeg}deg) translate(${dimensions.outer}px) rotate(-${currentAngleDeg}deg)`;
          }
        });
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [dimensions]);

  return (
    <div className="dark min-h-screen bg-[#0B0D0F] text-[#F8F9FA] relative overflow-x-hidden selection:bg-accent/30 selection:text-white">
      {/* Background Dot-Grid Texture */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none z-0 opacity-[0.85]" />
      
      {/* Interactive animated SVG gradient blobs in the background (Visual pass addition) */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <svg className="absolute w-[600px] h-[600px] top-[-10%] left-[-10%] opacity-25 blur-[120px]" viewBox="0 0 100 100">
            <motion.circle
              cx="50"
              cy="50"
              r="30"
              fill="url(#accent-gradient)"
              animate={{
                cx: [30, 70, 50, 30],
                cy: [40, 60, 30, 40],
                r: [25, 35, 20, 25]
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <defs>
              <radialGradient id="accent-gradient">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
          <svg className="absolute w-[700px] h-[700px] top-[20%] right-[-10%] opacity-20 blur-[130px]" viewBox="0 0 100 100">
            <motion.circle
              cx="50"
              cy="50"
              r="35"
              fill="url(#accent2-gradient)"
              animate={{
                cx: [70, 30, 50, 70],
                cy: [50, 70, 40, 50],
                r: [30, 40, 25, 30]
              }}
              transition={{
                duration: 28,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <defs>
              <radialGradient id="accent2-gradient">
                <stop offset="0%" stopColor="var(--accent2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--accent2)" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Navigation Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#0B0D0F]/80 backdrop-blur-lg border-b border-border/20 py-4 shadow-lg"
            : "bg-transparent py-6 border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center font-display font-bold text-white shadow-lg shadow-accent/20 group-hover:scale-105 transition duration-300">
              N
            </div>
            <span className="font-display font-semibold text-xl tracking-tight text-white group-hover:text-accent transition duration-300">
              Nexora
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-white transition duration-300 relative group py-1" style={{ color: "#9ca3af" }}>
              Features
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#grounding" className="text-sm hover:text-white transition duration-300 relative group py-1" style={{ color: "#9ca3af" }}>
              Real Numbers
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#about" className="text-sm hover:text-white transition duration-300 relative group py-1" style={{ color: "#9ca3af" }}>
              About
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -0.5 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
              <Link
                href="/login"
                className="text-sm font-medium hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 transition duration-300"
                style={{ color: "#9ca3af" }}
              >
                Sign in
              </Link>
            </motion.div>
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -1 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
              <Link href="/register" className="btn-primary text-sm px-5 py-2.5 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition duration-300 hover:shadow-premium">
                Get started
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section & Concentric Orbit Paths */}
      <section className="relative min-h-[98vh] flex items-center justify-center pt-24 pb-16 z-10 px-6 overflow-hidden">
        
        {/* Concentric Solar Orbit System (Centered & Responsive) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          
          {/* Inner Ring (Visible on all sizes) */}
          {dimensions.inner > 0 && (
            <>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#F8F9FA]/20 pointer-events-none transition-all duration-300"
                style={{ width: dimensions.inner * 2, height: dimensions.inner * 2 }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: dimensions.inner * 2, height: dimensions.inner * 2 }}>
                {ORBIT_NODES_INNER.map((node, i) => (
                  <div
                    key={node.name}
                    ref={(el) => { innerNodeRefs.current[i] = el; }}
                    className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 group/node pointer-events-auto cursor-pointer"
                    style={{
                      transform: `rotate(${node.angle}deg) translate(${dimensions.inner}px) rotate(-${node.angle}deg)`,
                    }}
                  >
                    <motion.div
                      whileHover={shouldReduceMotion ? {} : { scale: 1.15, rotate: 4 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                      className="w-full h-full rounded-full bg-[#12161A] border border-border/40 hover:border-accent hover:text-white flex items-center justify-center text-accent hover:shadow-[0_0_20px_rgba(79,140,255,0.2)] transition-colors duration-350 shadow-md animate-float"
                    >
                      {node.icon}
                    </motion.div>
                    <span className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#12161A] border border-border/60 text-[10px] px-2.5 py-1 rounded-md text-[#F8F9FA] opacity-0 group-hover/node:opacity-100 transition duration-300 shadow-lg pointer-events-none whitespace-nowrap z-50">
                      {node.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Middle Ring (Visible on Tablet and Desktop) */}
          {dimensions.middle > 0 && (
            <>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#F8F9FA]/15 pointer-events-none transition-all duration-300"
                style={{ width: dimensions.middle * 2, height: dimensions.middle * 2 }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: dimensions.middle * 2, height: dimensions.middle * 2 }}>
                {ORBIT_NODES_MIDDLE.map((node, i) => (
                  <div
                    key={node.name}
                    ref={(el) => { middleNodeRefs.current[i] = el; }}
                    className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 group/node pointer-events-auto cursor-pointer"
                    style={{
                      transform: `rotate(${node.angle}deg) translate(${dimensions.middle}px) rotate(-${node.angle}deg)`,
                    }}
                  >
                    <motion.div
                      whileHover={shouldReduceMotion ? {} : { scale: 1.15, rotate: -4 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                      className="w-full h-full rounded-full bg-[#12161A] border border-border/40 hover:border-accent hover:text-white flex items-center justify-center text-accent hover:shadow-[0_0_20px_rgba(79,140,255,0.2)] transition-colors duration-350 shadow-md animate-float delay-150"
                    >
                      {node.icon}
                    </motion.div>
                    <span className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#12161A] border border-border/60 text-[10px] px-2.5 py-1 rounded-md text-[#F8F9FA] opacity-0 group-hover/node:opacity-100 transition duration-300 shadow-lg pointer-events-none whitespace-nowrap z-50">
                      {node.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Outer Ring (Visible on Desktop Only) */}
          {dimensions.outer > 0 && (
            <>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#F8F9FA]/10 pointer-events-none transition-all duration-300"
                style={{ width: dimensions.outer * 2, height: dimensions.outer * 2 }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: dimensions.outer * 2, height: dimensions.outer * 2 }}>
                {ORBIT_NODES_OUTER.map((node, i) => (
                  <div
                    key={node.name}
                    ref={(el) => { outerNodeRefs.current[i] = el; }}
                    className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 group/node pointer-events-auto cursor-pointer"
                    style={{
                      transform: `rotate(${node.angle}deg) translate(${dimensions.outer}px) rotate(-${node.angle}deg)`,
                    }}
                  >
                    <motion.div
                      whileHover={shouldReduceMotion ? {} : { scale: 1.15, rotate: 4 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                      className="w-full h-full rounded-full bg-[#12161A] border border-border/40 hover:border-accent hover:text-white flex items-center justify-center text-accent hover:shadow-[0_0_20px_rgba(79,140,255,0.2)] transition-colors duration-350 shadow-md animate-float delay-300"
                    >
                      {node.icon}
                    </motion.div>
                    <span className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#12161A] border border-border/60 text-[10px] px-2.5 py-1 rounded-md text-[#F8F9FA] opacity-0 group-hover/node:opacity-100 transition duration-300 shadow-lg pointer-events-none whitespace-nowrap z-50">
                      {node.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Hero Central Content Centerpiece */}
        <motion.div
          initial={shouldReduceMotion ? {} : "hidden"}
          animate={shouldReduceMotion ? {} : "visible"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="relative max-w-3xl mx-auto text-center flex flex-col items-center z-10 select-none"
        >
          {/* Logo Container */}
          <motion.div
            variants={shouldReduceMotion ? {} : {
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1, transition: { type: "spring", damping: 15 } }
            }}
            className="relative mb-8"
          >
            <div className="absolute -inset-6 bg-accent/20 rounded-full blur-2xl animate-pulse-glow z-0" />
            <div className="relative w-16 h-16 rounded-2xl bg-[#12161A]/85 border border-border/50 flex items-center justify-center font-display font-bold text-3xl text-white shadow-2xl backdrop-blur-md">
              N
            </div>
          </motion.div>

          {/* Subheading Pill */}
          <motion.span
            variants={shouldReduceMotion ? {} : {
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 }
            }}
            className="pill bg-[#12161A]/95 border border-border/50 text-accent font-semibold px-4.5 py-1.5 text-xs mb-8 tracking-wider uppercase shadow-lg backdrop-blur-sm"
          >
            Not a confusing chart. Your smart growth partner.
          </motion.span>

          {/* Headline (H1 Typographical correction pass) */}
          <motion.h1
            variants={shouldReduceMotion ? {} : {
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-8 text-white max-w-3xl text-balance"
          >
            Grow your business
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#709DFE]">
              without the tech headache
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={shouldReduceMotion ? {} : {
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0 }
            }}
            className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed text-zinc-400"
          >
            We scan your business data, tell you what to do next in plain English, and write your customer messages for you.
          </motion.p>

          {/* Call To Action Buttons */}
          <motion.div
            variants={shouldReduceMotion ? {} : {
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 }
            }}
            className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto z-10"
          >
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -1 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/register"
                className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto flex items-center justify-center gap-2 group shadow-xl shadow-accent/25 hover:shadow-accent/40 transition duration-300 hover:shadow-premium"
              >
                Find my growth options
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -1 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-[#12161A] text-white hover:bg-[#181F27] hover:border-white/30 text-base font-medium px-8 py-3.5 w-full sm:w-auto transition duration-300 shadow-md hover:shadow-premium"
              >
                I already have an account
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* 5. Features Section (Polished Spacing and staggers) */}
      <section id="features" className="relative max-w-6xl mx-auto px-6 py-24 lg:py-32 z-10">
        <ScrollReveal className="text-center mb-20">
          <span className="text-xs font-semibold tracking-wider text-accent uppercase">How we help you grow</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 text-white tracking-tight">
            Simple steps to more sales
          </h2>
          <p className="text-sm md:text-base max-w-xl mx-auto mt-4 leading-relaxed text-zinc-400">
            We look at real facts from your business. No guesses, no made-up numbers, just clear advice.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {STEPS.map((step, idx) => (
            <ScrollReveal key={step.title} delay={shouldReduceMotion ? 0 : 0.05 * idx}>
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.01 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg p-8 h-full flex flex-col justify-between shadow-card hover:shadow-premium hover:border-accent/40 transition duration-300 group"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                    {step.icon}
                  </div>
                  <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-white group-hover:text-accent transition duration-300">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* 6. Grounding Section (Polished Spacing and staggers) */}
      <section id="grounding" className="relative max-w-4xl mx-auto px-6 py-20 lg:py-28 z-10">
        <ScrollReveal>
          <motion.div
            whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.01 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            className="p-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg relative overflow-hidden shadow-card hover:shadow-premium hover:border-accent/40 transition duration-300 group"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
              Real numbers, never made up.
            </h2>
            <p className="text-sm md:text-base leading-relaxed text-zinc-650 dark:text-zinc-300">
              If you haven't linked your digital tools or uploaded your customer list yet, we tell you clearly instead of inventing fake scores to look impressive. Every score and recommendation you see here is based purely on the real business facts you share with us.
            </p>
          </motion.div>
        </ScrollReveal>
      </section>

      {/* 7. Footer Section */}
      <footer id="about" className="border-t border-border/20 bg-[#0B0D0F] py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white shadow-lg shadow-accent/20">
              N
            </div>
            <span className="font-display font-semibold text-lg text-white">Nexora</span>
          </div>

          <div className="flex items-center gap-6 text-sm" style={{ color: "#9ca3af" }}>
            <a href="#features" className="hover:text-white transition duration-300">Features</a>
            <a href="#grounding" className="hover:text-white transition duration-300">Real Numbers</a>
            <Link href="/login" className="hover:text-white transition duration-300">Login</Link>
            <Link href="/register" className="hover:text-white transition duration-300">Signup</Link>
          </div>

          <p className="text-xs text-gray-500 text-center md:text-right">
            © {new Date().getFullYear()} Nexora. Built for small businesses that want to grow with clarity.
          </p>
        </div>
      </footer>
    </div>
  );
}

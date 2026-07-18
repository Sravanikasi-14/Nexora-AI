"use client";

import React from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";

interface IconProps {
  className?: string;
  size?: number;
  variant?: "default" | "monochrome" | "dark" | "light";
  animate?: boolean;
}

export default function Icon({
  className = "",
  size = 32,
  variant = "default",
  animate = true,
}: IconProps) {
  const shouldReduceMotion = useReducedMotion();

  // Animation variants for the logo image
  const logoVariants: Variants = {
    initial: { 
      opacity: 0, 
      scale: 0.85,
      y: 0
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" } 
    },
    hover: { 
      scale: 1.03,
      y: -2.5,
      filter: "drop-shadow(0 6px 14px rgba(59, 130, 246, 0.55))",
      transition: { duration: 0.25, ease: "easeOut" }
    }
  };

  return (
    <motion.img
      src="/logo.png"
      alt="Nexora Logo"
      width={size}
      height={size}
      className={`select-none object-contain ${className}`}
      style={{ 
        maxWidth: "100%", 
        height: "auto",
        aspectRatio: "1/1",
        display: "block"
      }}
      variants={logoVariants}
      whileHover={shouldReduceMotion || !animate ? {} : "hover"}
      initial={shouldReduceMotion || !animate ? {} : "initial"}
      animate={shouldReduceMotion || !animate ? {} : "animate"}
    />
  );
}

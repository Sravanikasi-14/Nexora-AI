"use client";

import React from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";
import Icon from "./Icon";

interface LogoProps {
  className?: string;
  iconSize?: number;
  variant?: "default" | "monochrome" | "dark" | "light";
  animate?: boolean;
  showSubtitle?: boolean;
}

export default function Logo({
  className = "",
  iconSize = 22,
  variant = "default",
  animate = true,
  showSubtitle = false,
}: LogoProps) {
  const shouldReduceMotion = useReducedMotion();

  // Typography color classes
  let textColorClass = "text-zinc-900 dark:text-zinc-100";
  if (variant === "monochrome") {
    textColorClass = "text-current";
  } else if (variant === "light") {
    textColorClass = "text-zinc-900";
  } else if (variant === "dark") {
    textColorClass = "text-zinc-100";
  }

  // Animation settings for the full logo transition
  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const textVariants: Variants = {
    initial: { opacity: 0, x: -6 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  return (
    <motion.div
      variants={shouldReduceMotion || !animate ? {} : containerVariants}
      initial={shouldReduceMotion || !animate ? {} : "initial"}
      animate={shouldReduceMotion || !animate ? {} : "animate"}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <Icon size={iconSize} variant={variant} animate={animate} />
      
      <div className="flex flex-col text-left justify-center">
        <motion.span
          variants={textVariants}
          className={`font-display font-extrabold text-[13px] tracking-[0.2em] uppercase select-none leading-none ${textColorClass}`}
        >
          Nexora
        </motion.span>
        {showSubtitle && (
          <motion.span
            variants={textVariants}
            className="font-body text-[6.5px] font-bold tracking-[0.32em] uppercase text-zinc-400 dark:text-zinc-500 select-none mt-1 leading-none"
          >
            AI Chief Growth Officer
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        base: "var(--base)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        border: "var(--border)",
        muted: "var(--muted)",
        ink: "var(--ink)",
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        success: "var(--success)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        // Shadcn UI base colors compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        grotesk: ["'Space Grotesk'", "sans-serif"],
      },
      borderRadius: {
        card: "24px",
        btn: "18px",
        input: "18px",
        modal: "28px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        premium: "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 10px 40px -12px rgba(15, 23, 42, 0.05)",
        glow: "0 0 24px 2px rgba(37, 99, 235, 0.12)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 8px 30px -10px rgba(15, 23, 42, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;

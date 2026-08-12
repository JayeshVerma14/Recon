import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "24px", lg: "40px" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          secondary: "rgb(var(--surface-secondary) / <alpha-value>)",
        },
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          subtle: "rgb(var(--border-subtle) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "#4664DC",
          sky: "#5AB7E3",
          indigo: "#3C4FDB",
        },
        success: "#179864",
        warning: "#F59E0B",
        critical: "#DC2626",
        info: "#4664DC",
        // category accents
        "cat-loantape": "#4664DC",
        "cat-servicing": "#06B6D4",
        "cat-ledger": "#F59E0B",
        "cat-collateral": "#8B5CF6",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      // Integer-only type scale from the design system.
      fontSize: {
        meta: ["11px", "16px"],
        helper: ["12px", "16px"],
        "body-sm": ["13px", "18px"],
        body: ["14px", "20px"],
        "body-lg": ["16px", "24px"],
        h3: ["18px", "24px"],
        h2: ["20px", "28px"],
        h1: ["24px", "32px"],
        "kpi-value": ["22px", "1"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        stage: "0 4px 16px -4px rgba(70,100,220,0.20)",
        "card-hover": "0 4px 16px -4px rgba(10,37,64,0.10)",
      },
      spacing: {
        sidebar: "244px",
        topbar: "56px",
      },
      backgroundImage: {
        "brand-cta": "linear-gradient(135deg, #5AB7E3 0%, #4664DC 55%, #3C4FDB 100%)",
      },
      transitionDuration: {
        fast: "150ms",
        standard: "200ms",
        slow: "300ms",
        page: "400ms",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up 200ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

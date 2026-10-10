import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clematis mapped to gold-adjacent tones for compatibility with legacy components
        clematis: {
          50: "#FDF9EC", 100: "#FAF2CC", 200: "#F5E28A",
          500: "#D4AF37", 600: "#5C4100", 700: "#4A3200",
        },
        // Mist mapped to the neutral parchment system
        mist: {
          50: "#F0EAE0", 200: "#E4DDD0", 300: "#D8D0C4", 600: "#3D2E26",
        },
        obsidian: {
          50: "var(--obsidian-50)", 100: "var(--obsidian-100)", 200: "var(--obsidian-200)",
          300: "var(--obsidian-300)", 400: "var(--obsidian-400)", 500: "var(--obsidian-500)",
          600: "var(--obsidian-600)", 700: "var(--obsidian-700)", 800: "var(--obsidian-800)",
          900: "var(--obsidian-900)",
        },
        gold: {
          50: "var(--gold-50)", 100: "var(--gold-100)", 200: "var(--gold-200)",
          300: "var(--gold-300)", 400: "var(--gold-400)", 500: "var(--gold-500)",
          600: "var(--gold-600)", 700: "var(--gold-700)", 800: "var(--gold-800)",
          900: "var(--gold-900)",
        },
        navy: {
          50: "var(--navy-50)", 100: "var(--navy-100)", 200: "var(--navy-200)",
          300: "var(--navy-300)", 400: "var(--navy-400)", 500: "var(--navy-500)",
          600: "var(--navy-600)", 700: "var(--navy-700)", 800: "var(--navy-800)",
          900: "var(--navy-900)",
        },
        bg: {
          page: "var(--bg-page)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          overlay: "var(--bg-overlay)",
          active: "var(--bg-active)",
          "gold-wash": "var(--bg-gold-wash)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          placeholder: "var(--text-placeholder)",
          disabled: "var(--text-disabled)",
          heading: "var(--text-heading)",
          gold: "var(--text-gold)",
          "gold-deep": "var(--text-gold-deep)",
          "on-dark": "var(--text-on-dark)",
        },
        border: {
          faint: "var(--border-faint)",
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          gold: "var(--border-gold)",
          "gold-faint": "var(--border-gold-faint)",
          mauve: "var(--border-gold)",   // legacy alias → gold
          active: "var(--border-gold)",  // legacy alias → gold
        },
        semantic: {
          success: {
            DEFAULT: "var(--color-success)",
            muted: "var(--color-success-muted)",
            border: "var(--color-success-border)",
            text: "var(--color-success-text)",
          },
          warning: {
            DEFAULT: "var(--color-warning)",
            muted: "var(--color-warning-muted)",
            border: "var(--color-warning-border)",
            text: "var(--color-warning-text)",
          },
          error: {
            DEFAULT: "var(--color-error)",
            muted: "var(--color-error-muted)",
            border: "var(--color-error-border)",
            text: "var(--color-error-text)",
          },
          info: {
            DEFAULT: "var(--color-info)",
            muted: "var(--color-info-muted)",
            border: "var(--color-info-border)",
            text: "var(--color-info-text)",
          },
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      backgroundImage: {
        "gradient-cta": "var(--gradient-cta)",
        "gradient-shimmer": "var(--gradient-shimmer)",
        "gradient-warm": "var(--gradient-warm)",
        "gradient-text": "var(--gradient-text)",
        "gradient-soft": "var(--gradient-soft)",
        "gradient-vault": "var(--gradient-vault)",
      },
      boxShadow: {
        "focus-ring": "0 0 0 3px rgba(201, 168, 76, 0.16)",
      },
      animation: {
        "dot-pulse": "dotPulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "sound-wave": "soundWave 1s ease-in-out infinite",
        "count-up": "countUp 1s ease-out forwards",
        "shimmer": "shimmer 1.8s ease-in-out infinite",
        "shimmer-pulse": "shimmerPulse 3s ease-in-out infinite",
        "confetti": "confettiFall 2s ease-in-out forwards",
        "gold-pulse": "goldPulse 950ms ease-out 3",
      },
      keyframes: {
        dotPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(200px) rotate(360deg)", opacity: "0" },
        }
      },
    },
  },
  plugins: [],
};

export default config;

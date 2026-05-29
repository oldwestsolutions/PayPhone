/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-source)", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#0c1a2e",
          deep: "#060e1a",
          mid: "#142a47",
        },
        cream: {
          DEFAULT: "#f6f3ec",
          warm: "#ede8dc",
          muted: "#e2dcd0",
        },
        copper: {
          DEFAULT: "#b87333",
          light: "#d4a574",
          dark: "#8f5a28",
        },
        crimson: {
          DEFAULT: "#b91c3c",
          bright: "#d62849",
        },
        slate: {
          uk: "#3d4f5f",
          soft: "#6b7c8a",
        },
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #060e1a 0%, #0c1a2e 42%, #1a3352 78%, #2d1f14 100%)",
        "copper-shine":
          "linear-gradient(90deg, #8f5a28 0%, #d4a574 50%, #8f5a28 100%)",
        "bell-pattern":
          "radial-gradient(circle at 20% 80%, rgba(184,115,51,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(185,28,60,0.06) 0%, transparent 45%)",
      },
      boxShadow: {
        luxury: "0 4px 24px -4px rgba(12, 26, 46, 0.12), 0 12px 48px -12px rgba(12, 26, 46, 0.18)",
        card: "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 32px -8px rgba(12, 26, 46, 0.15)",
      },
      letterSpacing: {
        corporate: "0.12em",
        wide: "0.2em",
      },
    },
  },
  plugins: [],
};

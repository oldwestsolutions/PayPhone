/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        luxury: {
          black: "#0a0a0a",
          dark: "#111111",
          panel: "#161616",
          elevated: "#1c1c1c",
          border: "#2a2a2a",
          white: "#ffffff",
          silver: "#e8e8e8",
          gray: "#a3a3a3",
          "gray-dim": "#737373",
          accent: "#f5f5f5",
        },
        wa: {
          green: "#ffffff",
          teal: "#ffffff",
          cream: "#161616",
          beige: "#2a2a2a",
          dark: "#f5f5f5",
          muted: "#a3a3a3",
          bubble: "#1c1c1c",
        },
      },
      backgroundImage: {
        "hero-luxury": "none",
        "web-pattern":
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M0 0h1v40H0zM39 0h1v40h-1z'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        panel: "0 8px 40px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
        bubble: "0 2px 8px rgba(0,0,0,0.4)",
        "luxury-glow": "0 0 0 1px rgba(255,255,255,0.12)",
      },
      borderRadius: { pill: "9999px" },
    },
  },
  plugins: [],
};

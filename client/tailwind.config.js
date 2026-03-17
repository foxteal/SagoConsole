/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-deep": "#080e1a",
        "bg-base": "#0c1222",
        "bg-surface": "#131b2e",
        "bg-card": "#1a2340",
        "bg-card-hover": "#1f2b4d",
        border: "#243055",
        "border-subtle": "#1a2744",
        accent: "#2dd4bf",
        "accent-dim": "#0d9488",
        "accent-glow": "rgba(45, 212, 191, 0.12)",
        "accent-glow-strong": "rgba(45, 212, 191, 0.25)",
        "text-primary": "#e2e8f0",
        "text-secondary": "#94a3b8",
        "text-tertiary": "#64748b",
        green: "#34d399",
        "green-dim": "rgba(52, 211, 153, 0.15)",
        red: "#f87171",
        "red-dim": "rgba(248, 113, 113, 0.15)",
        amber: "#f97316",
        "amber-dim": "rgba(249, 115, 22, 0.15)",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SatyaKavach design system tokens
        surface:      "#F8FAFC",
        card:         "#FFFFFF",
        border:       "#E2E8F0",
        ink:          "#0F172A",
        "ink-muted":  "#64748B",
        "ink-faint":  "#94A3B8",
        // Semantic status
        trust:        "#059669",
        "trust-bg":   "#ECFDF5",
        warning:      "#D97706",
        "warning-bg": "#FFFBEB",
        fraud:        "#DC2626",
        "fraud-bg":   "#FEF2F2",
        // Dark mode surfaces
        "dark-surface": "#0D1117",
        "dark-card":    "#161B22",
        "dark-border":  "#30363D",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:        "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(15 23 42 / 0.10)",
      },
    },
  },
  plugins: [],
};

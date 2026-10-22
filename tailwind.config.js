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
        bg: "rgb(var(--rgb-bg) / <alpha-value>)",
        surface: "rgb(var(--rgb-surface) / <alpha-value>)",
        card: "rgb(var(--rgb-card) / <alpha-value>)",
        border: ({ opacityValue }) =>
          opacityValue === undefined
            ? "var(--color-border)"
            : `rgb(var(--rgb-border) / ${opacityValue})`,
        ink: "rgb(var(--rgb-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--rgb-ink-muted) / <alpha-value>)",
        "ink-faint": "rgb(var(--rgb-ink-faint) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--rgb-accent) / <alpha-value>)",
          end: "rgb(var(--rgb-accent-end) / <alpha-value>)",
        },
        "accent-teal": "rgb(var(--rgb-teal) / <alpha-value>)",
        safe: "rgb(var(--rgb-safe) / <alpha-value>)",
        suspicious: "rgb(var(--rgb-suspicious) / <alpha-value>)",
        fake: "rgb(var(--rgb-fake) / <alpha-value>)",
        trust: "rgb(var(--rgb-safe) / <alpha-value>)",
        "trust-bg": "var(--color-safe-bg)",
        warning: "rgb(var(--rgb-suspicious) / <alpha-value>)",
        "warning-bg": "var(--color-suspicious-bg)",
        fraud: "rgb(var(--rgb-fake) / <alpha-value>)",
        "fraud-bg": "var(--color-fake-bg)",
        "dark-surface": "rgb(var(--rgb-bg) / <alpha-value>)",
        "dark-card": "rgb(var(--rgb-surface) / <alpha-value>)",
        "dark-border": ({ opacityValue }) =>
          opacityValue === undefined
            ? "var(--color-border)"
            : `rgb(var(--rgb-border) / ${opacityValue})`,
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(15 23 42 / 0.10)",
      },
    },
  },
  plugins: [],
};

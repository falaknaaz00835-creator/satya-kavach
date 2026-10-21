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
        /* ── Paper & ink (editorial base) ── */
        paper:          "#F6F3EC",
        "paper-sunk":   "#EFEBE0",
        surface:        "#F6F3EC",
        card:           "#FFFDF8",
        border:         "#DFD9CB",
        rule:           "#DFD9CB",
        "rule-strong":  "#C7BFAD",
        ink:            "#14140F",
        "ink-soft":     "#3F3F38",
        "ink-muted":    "#62625A",
        "ink-faint":    "#8A8A7D",

        /* ── Signal colours ── */
        trust:          "#12715B",
        "trust-bg":     "#E7F2ED",
        warning:        "#A9700C",
        "warning-bg":   "#FAF1DC",
        fraud:          "#B3382B",
        "fraud-bg":     "#FAEAE6",

        accent:         "#C8452B",
        "accent-bg":    "#FBEDE8",
        jade:           "#12715B",
        "jade-bg":      "#E7F2ED",
        saffron:        "#A9700C",
        "saffron-bg":   "#FAF1DC",
        vermillion:     "#B3382B",
        "vermillion-bg": "#FAEAE6",

        /* ── Night desk ── */
        "dark-surface": "#141412",
        "dark-card":    "#1B1B18",
        "dark-border":  "#33322C",
      },
      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "Iowan Old Style", "Georgia", "serif"],
        serif:   ["Fraunces", "Iowan Old Style", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
      },
      letterSpacing: {
        eyebrow: "0.18em",
        tightest: "-0.03em",
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "4px",
        lg: "5px",
        xl: "7px",
        "2xl": "10px",
        "3xl": "14px",
      },
      boxShadow: {
        hairline:    "0 1px 0 0 rgb(20 20 15 / 0.04), 0 0 0 1px rgb(20 20 15 / 0.03)",
        card:        "0 1px 0 0 rgb(20 20 15 / 0.05), 0 1px 2px 0 rgb(20 20 15 / 0.04)",
        "card-hover": "0 2px 0 0 rgb(20 20 15 / 0.06), 0 8px 24px -12px rgb(20 20 15 / 0.25)",
        lift:        "0 18px 40px -24px rgb(20 20 15 / 0.45)",
        inset:       "inset 0 1px 0 0 rgb(255 255 255 / 0.6)",
      },
      backgroundImage: {
        "paper-grain":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        "hatch":
          "repeating-linear-gradient(45deg, rgb(20 20 15 / 0.06) 0 1px, transparent 1px 7px)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        sweep: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.25, 1, 0.5, 1) both",
        sweep: "sweep 2.4s linear infinite",
        blink: "blink 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

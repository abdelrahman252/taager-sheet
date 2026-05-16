/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        bg: "#0A0A0F",
        surface: "#12121A",
        border: "#1E1E2E",
        accent: "#F97316",
        "accent-dim": "#7C3AED",
        muted: "#6B7280",
        success: "#10B981",
        warning: "#FBBF24",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
}

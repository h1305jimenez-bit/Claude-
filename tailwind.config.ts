import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        surface: "#f9f9f9",
        "surface-secondary": "#f0f0f0",
        border: "#e5e5e5",
        "text-primary": "#0d0d0d",
        "text-dimmed": "#6b6b6b",
        "btn-bg": "#0d0d0d",
        "btn-text": "#ffffff",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        syne: ["var(--font-inter)", "sans-serif"],
        "dm-sans": ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
      },
      transitionDuration: {
        fast: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;

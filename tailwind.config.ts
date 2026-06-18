import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marca Telovendo
        brand: {
          50: "#f3f1ff",
          100: "#e9e5ff",
          200: "#d5ccff",
          300: "#b6a5ff",
          400: "#9173ff",
          500: "#6d3bff", // principal
          600: "#5b21f0",
          700: "#4c16cc",
          800: "#3f15a6",
          900: "#361685",
        },
        accent: {
          400: "#ffb020",
          500: "#ff9500", // ámbar de acento
          600: "#e07b00",
        },
        ink: "#15131f",
        muted: "#6b6780",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 8px 30px rgba(21, 19, 31, 0.08)",
        glow: "0 10px 40px rgba(109, 59, 255, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;

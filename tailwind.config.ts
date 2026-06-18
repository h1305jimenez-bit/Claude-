import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marca Telovendo — azul estilo Facebook
        brand: {
          50: "#eaf2ff",
          100: "#d9e7ff",
          200: "#b3cfff",
          300: "#80b0ff",
          400: "#4a90ff",
          500: "#1877f2", // principal (azul Facebook)
          600: "#0f66d9",
          700: "#0c52b0",
          800: "#0d4694",
          900: "#0f3b78",
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
        glow: "0 10px 40px rgba(24, 119, 242, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;

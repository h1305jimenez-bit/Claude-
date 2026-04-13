import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // HEC Paris inspired palette
        hec: {
          navy: "#0C2340", // primary brand navy
          ink: "#051838", // deepest navy (text/contrast)
          blue: "#1E3A5F", // secondary navy
          gold: "#C9A227", // warm gold accent
          "gold-soft": "#EADFA9", // pale gold surface
          ivory: "#FAF7F0", // main background
          sand: "#F2EBD9", // subtle warm surface
          stone: "#E8E1D1", // hairline borders
          burgundy: "#7A1F2A", // error / remove
        },
        revolut: {
          blue: "#0666EB",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(12, 35, 64, 0.04), 0 4px 16px rgba(12, 35, 64, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;

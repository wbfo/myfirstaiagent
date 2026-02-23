import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hb: {
          bg: "#0a0a10",
          panel: "#1c1c28",
          panel2: "#13131c",
          border: "#2a2a3d",
          text: "#e2e8f0",
          muted: "#64748b",
          amber: "#f59e0b",
          cyan: "#06b6d4",
          green: "#10b981",
          red: "#ef4444",
          blue: "#3b82f6",
          purple: "#8b5cf6",
        },
      },
    },
  },
  plugins: [],
};

export default config;

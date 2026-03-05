import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#3B82F6",
          light: "#DBEAFE",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#F97316",
          light: "#FED7AA",
          foreground: "#ffffff",
        },
        accent: {
          purple: "#8B5CF6",
          green: "#10B981",
          pink: "#EC4899",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        bento: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        "bento-hover": "0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        glass: "0 8px 32px rgba(0,0,0,0.06)",
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};
export default config;

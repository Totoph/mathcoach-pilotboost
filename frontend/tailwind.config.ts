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
          DEFAULT: "#0A6DFF",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#FF7B00",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
export default config;

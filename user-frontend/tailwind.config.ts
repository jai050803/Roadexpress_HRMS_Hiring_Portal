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
        brand: {
          50: "#FDF2EE",
          100: "#FBE3DC",
          200: "#F7C3B3",
          300: "#F29D85",
          400: "#EE7758",
          500: "#F4511E", // Core primary freight orange
          600: "#D84315", // Primary hover
          700: "#BF360C",
          800: "#8C2709",
          900: "#5A1906",
          DEFAULT: "#F4511E",
        },
        charcoal: {
          800: "#1A222D",
          900: "#121820", // Cinematic hero & nav
          950: "#0A0E14",
        },
        signal: {
          screened: "#D97706",
          applied: "#64748B",
          shortlisted: "#F4511E",
          concluded: "#78716C",
          published: "#0F766E",
        },
      },
    },
  },
  plugins: [],
};

export default config;

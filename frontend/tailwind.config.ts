import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        brand: {
          50: "#FDF2EE",
          100: "#FBE3DC",
          200: "#F7C3B3",
          300: "#F29D85",
          400: "#EE7758",
          500: "#F4511E", // Core primary brand freight orange
          600: "#D84315", // Primary hover
          700: "#BF360C", // Active / pressed
          800: "#8C2709",
          900: "#5A1906",
          DEFAULT: "#F4511E",
        },
        charcoal: {
          50: "#F6F8FA",
          100: "#E9ECF0",
          200: "#D2D8E1",
          300: "#A9B4C4",
          400: "#7A8A9E",
          500: "#556478",
          600: "#3D4857",
          700: "#2B3440",
          800: "#1C232B",
          900: "#12171E", // Top-bar and dark accents
          950: "#0A0D12",
        },
        signal: {
          screened: "#D97706",
          applied: "#64748B",
          shortlisted: "#F4511E",
          concluded: "#78716C",
          published: "#0F766E",
          active: {
            text: "#9A3412",
            bg: "#FFF7ED",
            border: "#FED7AA",
          },
          attention: {
            text: "#B45309",
            bg: "#FEF3C7",
            border: "#FDE68A",
          },
          neutral: {
            text: "#334155",
            bg: "#F1F5F9",
            border: "#CBD5E1",
          },
          success: {
            text: "#0F766E",
            bg: "#F0FDFA",
            border: "#99F6E4",
          },
          danger: {
            text: "#78716C",
            bg: "#F5F5F4",
            border: "#E7E5E4",
          },
        },
        primary: {
          DEFAULT: "#F4511E",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;

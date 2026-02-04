import type { Config } from "tailwindcss";

export default {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        parchment: {
          bg: "#F5E6C8",
          dark: "#D4C4A8"
        },
        ink: {
          brown: "#4A3728"
        },
        accent: {
          gold: "#FFD859",
          coral: "#FF6B6B",
          sky: "#87CEEB"
        }
      }
    }
  },
  plugins: []
} satisfies Config;


import type { Config } from "tailwindcss";

export default {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        ui: ["var(--font-nunito)", "ui-sans-serif", "system-ui", "sans-serif"],
        rank: ["var(--font-space-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        pixel: ["var(--font-pixel)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        terrain: {
          grassLight: "#7EC850",
          grassDark: "#5B8C3E",
          waterShallow: "#6CCFF6",
          waterDeep: "#3A8DBF",
          sand: "#E8D170",
          dirtPath: "#C9A567",
          stone: "#8B9BB4",
          snow: "#F0F4F8"
        },
        parchment: {
          bg: "#F5E6C8",
          dark: "#D4C4A8"
        },
        ink: {
          brown: "#4A3728",
          // Slightly darker than the original spec's #8B7355 so small text passes WCAG AA on parchment.
          muted: "#78624B"
        },
        accent: {
          gold: "#FFD859",
          coral: "#FF6B6B",
          sky: "#87CEEB",
          cream: "#FFF9F0"
        }
      }
    }
  },
  plugins: []
} satisfies Config;

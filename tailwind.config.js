/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: "#E91E8C",
          light: "#FF4DB8",
          dark: "#C2185B",
          accent: "#FF6EC7",
        },
        purple: {
          DEFAULT: "#7B1FA2",
          light: "#AB47BC",
          dark: "#4A0072",
        },
        brand: {
          bg: "#ffffff",
          screen: "#F9F8FF",
          dark: "#0D0120",
          muted: "#9CA3AF",
          subtle: "#6B7280",
          border: "#F3F4F6",
          card: "#FDF0F7",
        },
      },
    },
  },
  plugins: [],
};

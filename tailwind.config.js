/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        velvet: "#09090d",
        graphite: "#11121a",
        champagne: "#f6d88a",
        amethyst: "#9b5cff",
        plasma: "#36f4c7",
      },
      boxShadow: {
        glow: "0 0 34px rgba(155, 92, 255, 0.34)",
        gold: "0 0 34px rgba(246, 216, 138, 0.26)",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

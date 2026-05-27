/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f14",
        panel: "#111821",
        panelSoft: "#151f2b",
        line: "#253241",
        brand: "#39d7a5",
        warn: "#f8c14a",
        danger: "#ff6b6b",
        skyline: "#64b5f6"
      },
      boxShadow: {
        glow: "0 18px 60px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};

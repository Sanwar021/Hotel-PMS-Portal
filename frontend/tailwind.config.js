/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hotel: {
          bg: "#171411",
          panel: "#24201c",
          panel2: "#2c2722",
          surface: "#1f1b17",
          line: "rgba(255, 255, 255, 0.08)",
          text: "#f5eee4",
          muted: "#a49a8f",
          accent: "#ef8f31",
          gold: "#d8a855",
          ink: "#112631",
          deep: "#07161d",
          deep2: "#173542",
          sand: "#ede3cf",
          paper: "#f8f4eb",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-accent': '0 0 25px rgba(239, 143, 49, 0.15)',
        'glow-gold': '0 0 25px rgba(216, 168, 85, 0.15)',
        'card-dark': '0 8px 30px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}


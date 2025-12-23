/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          100: "#FFD700",
          200: "#ddb900",
          300: "#917800",
        },
        accent: {
          100: "#C0C0C0",
          200: "#626262",
        },
        text: {
          100: "#333333",
          200: "#5c5c5c",
        },
        bg: {
          100: "#F7F7F7",
          200: "#ededed",
          300: "#c4c4c4",
        },
      },
      fontFamily: {
        heading: ["Julius Sans One", "sans-serif"],
        body: ["Libre Franklin", "sans-serif"],
      },
      boxShadow: {
        gold: "0 4px 12px rgba(255, 215, 0, 0.3)",
        "gold-lg": "0 8px 20px rgba(255, 215, 0, 0.4)",
        "neu-gold":
          "inset 4px 4px 10px rgba(189, 156, 0, 0.3), inset -4px -4px 10px rgba(255, 223, 0, 0.5)",
        "neu-gold-hover":
          "inset 2px 2px 5px rgba(189, 156, 0, 0.3), inset -2px -2px 5px rgba(255, 223, 0, 0.5), 2px 2px 8px rgba(189, 156, 0, 0.2)",
        "neu-silver":
          "inset 4px 4px 10px rgba(98, 98, 98, 0.3), inset -4px -4px 10px rgba(224, 224, 224, 0.5)",
        "neu-silver-hover":
          "inset 2px 2px 5px rgba(98, 98, 98, 0.3), inset -2px -2px 5px rgba(224, 224, 224, 0.5), 2px 2px 8px rgba(98, 98, 98, 0.2)",
        "neu-light":
          "inset 4px 4px 10px rgba(188, 188, 188, 0.3), inset -4px -4px 10px rgba(255, 255, 255, 0.8)",
        "neu-light-hover":
          "inset 2px 2px 5px rgba(188, 188, 188, 0.3), inset -2px -2px 5px rgba(255, 255, 255, 0.8), 2px 2px 8px rgba(188, 188, 188, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.6s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

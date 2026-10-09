/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wa-green': { 50: '#e8f5e9', 100: '#c8e6c9', 200: '#a5d6a7', 300: '#81c784', 400: '#66bb6a', 500: '#25D366', 600: '#128C7E', 700: '#075E54', 800: '#054d44', 900: '#043b35' },
        'wa-dark': { 50: '#f5f5f5', 100: '#e0e0e0', 200: '#202c33', 300: '#182229', 400: '#111b21', 500: '#0b141a', 600: '#09111a' },
        'wa-teal': { 500: '#00a884', 600: '#008069', 700: '#005c4b' },
        'wa-chat': { 
          light: '#efeae2', 
          dark: '#0b141a', 
          bubble: { 
            out: { light: '#d9fdd3', dark: '#005c4b' }, 
            in: { light: '#ffffff', dark: '#202c33' } 
          } 
        }
      }
    },
  },
  plugins: [],
}

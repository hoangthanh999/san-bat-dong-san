/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066FF',
          dark: '#0047B3',
          light: '#4D94FF',
        },
        accent: {
          DEFAULT: '#FF6B35',
          dark: '#E64A19',
          light: '#FF8A65',
        },
        background: {
          light: '#FFFFFF',
          dark: '#1A1A1A',
        },
        surface: {
          light: '#F5F5F5',
          dark: '#2C2C2C',
        },
        text: {
          primary: {
            light: '#1A1A1A',
            dark: '#FFFFFF',
          },
          secondary: {
            light: '#666666',
            dark: '#AAAAAA',
          },
        },
        border: {
          light: '#E0E0E0',
          dark: '#3C3C3C',
        },
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      fontFamily: {
        // iOS: SF Pro, Android: Roboto (system defaults)
      },
    },
  },
  plugins: [],
}

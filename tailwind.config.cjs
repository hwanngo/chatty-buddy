/** @type {import('tailwindcss').Config} */

function parentSiblingHoverPlugin({ addVariant, e }) {
  addVariant('parent-sibling-hover', ({ modifySelectors, separator }) => {
    modifySelectors(({ className }) => {
      return `.parent-sibling:hover ~ .parent .${e(
        `parent-sibling-hover${separator}${className}`
      )}`;
    });
  });
}

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['DM Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'Arial', 'sans-serif'],
      serif: ['Lora', 'Georgia', 'ui-serif', 'serif'],
      mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
    extend: {
      typography: {
        DEFAULT: {
          css: {
            pre: { padding: 0, margin: 0 },
            ul: {
              'list-style-type': 'none',
            },
          },
        },
      },
      colors: {
        // Anthropic/Claude-inspired warm palette
        anthropic: {
          parchment: '#f5f4ed',
          ivory: '#faf9f5',
          nearBlack: '#141413',
          darkSurface: '#30302e',
          terracotta: '#c96442',
          coral: '#d97757',
          oliveGray: '#5e5d59',
          stoneGray: '#87867f',
          warmSilver: '#b0aea5',
          warmSand: '#e8e6dc',
          borderCream: '#f0eee6',
          borderWarm: '#e8e6dc',
          borderDark: '#30302e',
          charcoalWarm: '#4d4c48',
          darkWarm: '#3d3d3a',
          ringWarm: '#d1cfc5',
        },
        // Keep gray for compatibility with any remaining usages
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          650: '#444444',
          700: '#404040',
          800: '#262626',
          850: '#171717',
          900: '#090909',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), parentSiblingHoverPlugin],
  darkMode: 'class',
};

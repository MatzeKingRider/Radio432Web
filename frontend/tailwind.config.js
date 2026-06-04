/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--color-accent)',
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        'text-primary': 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
      },
      borderRadius: {
        button: 'var(--radius-button)',
      },
    },
  },
  plugins: [],
}

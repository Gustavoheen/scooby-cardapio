/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        scooby: {
          amarelo:  '#FFD700',
          vermelho: '#CC0000',
          escuro:   '#111111',
          card:     '#1e1e1e',
          borda:    '#2e2e2e',
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'slide-right': 'slideRight 1s ease-in-out infinite',
      },
      keyframes: {
        slideRight: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(6px)' },
        },
      },
      colors: {
        scooby: {
          amarelo:  '#ec4899',   // rosa vibrante — preços, destaques, active
          vermelho: '#9d174d',   // rosa profundo — botões CTA
          escuro:   '#fff5f9',   // fundo principal levíssimo rosado
          card:     '#ffffff',   // cards brancos
          borda:    '#fce7f3',   // borda rosa suave
        }
      }
    },
  },
  plugins: [],
}

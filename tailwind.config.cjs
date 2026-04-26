/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.75rem',
      screens: { '2xl': '1200px' },
    },
    extend: {
      colors: {
        // Brutalist editorial palette
        cream: '#F5F1E8',
        paper: '#FFFFFF',
        ink: {
          DEFAULT: '#0A0A0A',
          muted: '#5A554E',
          dim: '#8A847B',
        },
        line: '#E8E1D0',
        pop: {
          DEFAULT: '#FFD93D',
        },
        // Shadcn-compat tokens (still used by a few primitives)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          tint: '#EDE7FE',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          tint: '#FFE4DD',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          tint: '#D7F5E6',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brutal-xs': '1px 1px 0 0 #0A0A0A',
        'brutal-sm': '2px 2px 0 0 #0A0A0A',
        brutal: '4px 4px 0 0 #0A0A0A',
        'brutal-md': '5px 5px 0 0 #0A0A0A',
        'brutal-lg': '6px 6px 0 0 #0A0A0A',
        'brutal-xl': '8px 8px 0 0 #0A0A0A',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};

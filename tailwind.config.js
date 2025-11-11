// This file is not directly used by the browser in this setup.
// It serves as the single source of truth for the design system.
// The configuration object is copied into a <script> tag in index.html.

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Based on architecture.md "Khu vườn tri thức Zen"
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // Main primary: zen-green-600 (Màu xanh rêu đậm)
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // Main secondary: stone-500 (Màu xám đá cuội)
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Main success: jade-500 (Màu xanh ngọc bích)
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        error: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#e11d48', // Main error: terracotta-500 (Màu đất nung) - using a clearer red
          600: '#be123c',
          700: '#9f1239',
          800: '#881337',
          900: '#7e173b',
          950: '#4c0519',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        info: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Custom semantic colors from architecture
        'background': '#FAF8F5',       // bamboo-50 (Màu nền trắng ngà)
        'surface': '#ffffff',             // surface: white
        'text-main': '#1e293b',            // charcoal-800 -> slate-800
        'text-subtle': '#64748b',          // stone-600 -> slate-500
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
    },
  },
  plugins: [],
};
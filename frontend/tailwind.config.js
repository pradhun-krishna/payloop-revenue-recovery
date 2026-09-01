/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0F1117',
          surface: '#1A1D27',
          elevated: '#22263A',
        },
        border: {
          DEFAULT: '#2E3250',
        },
        text: {
          primary: '#E8EAF0',
          secondary: '#8B90A7',
          tertiary: '#555B7A',
        },
        accent: '#4F7EFF',
        success: '#2DD4A0',
        warning: '#F5A623',
        danger: '#FF4D6A',
        neutral: '#3D4266',
        // Failure class badge colors
        badge: {
          network: '#4F7EFF',
          funds: '#F5A623',
          decline: '#8B90A7',
          expiry: '#A78BFA',
          upi: '#38BDF8',
          fraud: '#FF4D6A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '11': '0.6875rem',
        '12': '0.75rem',
        '14': '0.875rem',
        '24': '1.5rem',
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
      },
      borderRadius: {
        'card': '6px',
        'tag': '4px',
        'indicator': '2px',
      },
      letterSpacing: {
        'display': '-0.02em',
        'label': '0.04em',
      },
      lineHeight: {
        'body': '1.6',
      },
    },
  },
  plugins: [],
}

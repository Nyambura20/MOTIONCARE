module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Primary maroon palette
        primary: '#800000',
        primaryLight: '#a52a2a',
        primaryDark: '#5a0000',
        
        // Semantic colors
        success: '#16a34a',
        successLight: '#dcfce7',
        warning: '#f59e0b',
        warningLight: '#fef3c7',
        error: '#dc2626',
        errorLight: '#fee2e2',
        info: '#0284c7',
        infoLight: '#e0f2fe',
        
        // Neutral grays
        gray50: '#f8f9fa',
        gray100: '#e9ecef',
        gray200: '#dee2e6',
        gray300: '#ced4da',
        gray600: '#6c757d',
        gray800: '#343a40',
        gray900: '#212529',
        
        // Clinical colors
        painHeatLow: '#fef3c7',
        painHeatMedium: '#fed7aa',
        painHeatHigh: '#fca5a5',
        recoveryZone: '#d1fae5',
        cautionZone: '#fed7aa',
        riskZone: '#fecaca',
        
        // Legacy aliases for compatibility
        accent: '#f8f9fa',
        textPrimary: '#212529',
        textSecondary: '#6c757d',
        border: '#e9ecef',
        clinicalEmphasis: '#d32f2f'
      },
      fontFamily: {
        display: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Inter', 'Segoe UI', 'Tahoma', 'sans-serif'],
        body: ['Inter', 'Open Sans', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      fontSize: {
        hero: 'clamp(2.5rem, 5vw, 3.5rem)',
        'h1': 'clamp(2rem, 4vw, 2.5rem)',
        'h2': 'clamp(1.5rem, 3vw, 2rem)',
        'h3': '1.25rem',
        caption: '0.75rem'
      },
      lineHeight: {
        tight: '1.2',
        relaxed: '1.75'
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px'
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'clinical': '0 4px 12px rgba(128, 0, 0, 0.08)',
        'focus': '0 0 0 3px rgba(128, 0, 0, 0.15)'
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms'
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      spacing: {
        '18': '4.5rem',
        '128': '32rem'
      }
    }
  },
  plugins: []
}

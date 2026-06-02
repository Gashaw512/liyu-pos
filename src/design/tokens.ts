export const tokens = {
  colors: {
    berbere: {
      50:  '#fdf0f2',
      100: '#f9cdd3',
      200: '#f49aa7',
      300: '#e8687a',
      400: '#d4394f',
      500: '#8B2635', // PRIMARY
      600: '#7a1f2d',
      700: '#611926',
      800: '#49131d',
      900: '#310d13',
    },
    gold: {
      50:  '#fdf8ee',
      100: '#faecd0',
      200: '#f5d89f',
      300: '#efbe65',
      400: '#E2A03F', // SECONDARY
      500: '#c8852a',
      600: '#a86b20',
      700: '#865218',
      800: '#633b10',
      900: '#42250a',
    },
    cream: {
      50:  '#fdfcf8',
      100: '#F7F4EB', // BACKGROUND
      200: '#ede9db',
      300: '#ddd8c8',
      400: '#ccc5b0',
    },
    coffee: {
      50:  '#f5f0ef',
      100: '#ddd0ce',
      200: '#bba09c',
      300: '#9b7b74',
      400: '#7a5a54',
      500: '#5a3e38',
      600: '#3f2a24',
      700: '#2B1E1A', // TEXT PRIMARY
      800: '#1a110e',
      900: '#0d0807',
    },
    semantic: {
      success: '#1e7e4a',
      successBg: '#e8f5ee',
      warning: '#c47a00',
      warningBg: '#fff8e6',
      danger: '#c0392b',
      dangerBg: '#fdecea',
      info: '#1565c0',
      infoBg: '#e3f0fc',
    }
  },

  typography: {
    // Primary: DM Sans (Latin)
    // Ethiopian: Noto Sans Ethiopic
    // Display: Playfair Display (brand moments only)
    fontFamily: {
      sans: '"DM Sans", "Noto Sans Ethiopic", system-ui, sans-serif',
      display: '"Playfair Display", serif',
      mono: '"JetBrains Mono", monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      md: '16px',
      lg: '18px',
      xl: '22px',
      '2xl': '26px',
      '3xl': '32px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7,
    }
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },

  shadows: {
    card: '0 1px 3px rgba(43,30,26,0.08), 0 1px 2px rgba(43,30,26,0.04)',
    elevated: '0 4px 16px rgba(43,30,26,0.10)',
    modal: '0 20px 60px rgba(43,30,26,0.18)',
  },

  touchTargets: {
    minimum: '44px',   // WCAG minimum
    comfortable: '52px', // recommended for POS
    large: '64px',     // primary actions
  },

  breakpoints: {
    sm: '390px',   // small Android
    md: '430px',   // large Android / iPhone Pro Max
    lg: '768px',   // tablet
    xl: '1024px',  // desktop
  }
}
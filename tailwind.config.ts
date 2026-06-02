// import type { Config } from 'tailwindcss'
// import { tokens } from './src/design/tokens'

// const config: Config = {
//   // Make absolutely sure Tailwind scans all localized group directories [locale]
//   content: [
//     './src/**/*.{js,ts,jsx,tsx,mdx}',
//     './src/app/**/*.{js,ts,jsx,tsx,mdx}',
//     './src/components/**/*.{js,ts,jsx,tsx,mdx}',
//   ],
//   darkMode: 'class',
//   theme: {
//     extend: {
//       colors: {
//         berbere: tokens.colors.berbere,
//         gold: tokens.colors.gold,
//         cream: tokens.colors.cream,
//         coffee: tokens.colors.coffee,
//         // Safely spread the semantic colors
//         ...tokens.colors.semantic,
//       },
//       fontFamily: {
//         // Fix: Tailwind expects a clean array of strings, or a single unnested string
//         sans: ["DM Sans", "Noto Sans Ethiopic", "system-ui", "sans-serif"],
//         display: ["Playfair Display", "serif"],
//         mono: ["JetBrains Mono", "monospace"],
//       },
//       fontSize: {
//         xs: tokens.typography.fontSize.xs,
//         sm: tokens.typography.fontSize.sm,
//         base: tokens.typography.fontSize.base,
//         md: tokens.typography.fontSize.md,
//         lg: tokens.typography.fontSize.lg,
//         xl: tokens.typography.fontSize.xl,
//         '2xl': tokens.typography.fontSize['2xl'],
//         '3xl': tokens.typography.fontSize['3xl'],
//       },
//       fontWeight: {
//         regular: tokens.typography.fontWeight.regular.toString(),
//         medium: tokens.typography.fontWeight.medium.toString(),
//         semibold: tokens.typography.fontWeight.semibold.toString(),
//         bold: tokens.typography.fontWeight.bold.toString(),
//       },
//       lineHeight: {
//         tight: tokens.typography.lineHeight.tight.toString(),
//         normal: tokens.typography.lineHeight.normal.toString(),
//         relaxed: tokens.typography.lineHeight.relaxed.toString(),
//       },
//       borderRadius: tokens.radii,
//       boxShadow: tokens.shadows,
//       spacing: tokens.spacing,
//       screens: tokens.breakpoints,
//     },
//   },
//   plugins: [require('tailwindcss-animate')],
// }
// export default config
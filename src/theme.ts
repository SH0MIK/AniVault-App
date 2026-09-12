// Exact values pulled from the website's own stylesheet
// (public/assets/css/style.css :root block) — not approximated, so the app
// matches the site's actual palette pixel-for-pixel rather than "close enough".
export const colors = {
  bgBase: '#0a0b0e',
  bgSurface: '#111318',
  bgCard: '#161a22',
  bgHover: '#1d2230',
  accent: '#7c3aed',
  accentDim: '#5b21b6',
  accentGlow: 'rgba(124,58,237,0.25)',
  gold: '#f5c842',
  teal: '#1dd1a1',
  purple: '#a29bfe',
  blue: '#54a0ff',
  textPrimary: '#f0f0f5',
  textSecondary: '#9ba3b8',
  textMuted: '#5a6278',
  border: 'rgba(255,255,255,0.07)',
  borderAccent: 'rgba(124,58,237,0.4)',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;

// Site uses 'Orbitron' for display/headings and 'Exo 2' for body text —
// loaded via @expo-google-fonts in App.tsx and referenced by these family
// names everywhere in the app instead of the RN system font.
export const fonts = {
  display: 'Orbitron_700Bold',
  displayMedium: 'Orbitron_600SemiBold',
  body: 'Exo2_400Regular',
  bodyMedium: 'Exo2_500Medium',
  bodySemibold: 'Exo2_600SemiBold',
  bodyBold: 'Exo2_700Bold',
} as const;

export const colors = {
  bgBase: '#000000',
  bgSurface: '#08080c',
  bgCard: '#0f0f14',
  bgHover: '#18181e',
  accent: '#ffffff',
  accentDim: '#cccccc',
  accentGlow: 'rgba(255,255,255,0.14)',
  gold: '#FFC107',
  teal: '#1dd1a1',
  purple: '#a29bfe',
  blue: '#54a0ff',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.68)',
  textMuted: 'rgba(255,255,255,0.40)',
  border: 'rgba(255,255,255,0.08)',
  borderAccent: 'rgba(255,255,255,0.18)',
} as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24 } as const;

export const fonts = {
  display: 'Orbitron_700Bold',
  displayMedium: 'Orbitron_600SemiBold',
  body: 'Exo2_400Regular',
  bodyMedium: 'Exo2_500Medium',
  bodySemibold: 'Exo2_600SemiBold',
  bodyBold: 'Exo2_700Bold',
} as const;

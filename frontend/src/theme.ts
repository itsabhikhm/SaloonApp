export const theme = {
  bg: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1C1C1E',
  gold: '#D4AF37',
  goldLight: '#F3E5AB',
  goldMuted: '#8C7326',
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textInverse: '#0A0A0A',
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.05)',
  success: '#27AE60',
  error: '#E74C3C',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const formatINR = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

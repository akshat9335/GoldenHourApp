// Design tokens ported 1:1 from golden-hour.html :root CSS variables.
export const colors = {
  red: '#D32F2F',
  redDark: '#B71C1C',
  redGlow: 'rgba(211,47,47,0.18)',
  bg: '#F8FAFC',
  ink: '#1A1A1A',
  inkSoft: '#5B6472',
  inkFaint: '#98A2AE',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  blue: '#1565C0',
  blueBg: '#E8F0FB',
  line: '#E7EBF0',
  card: '#FFFFFF',
  amber: '#B8860B',
  amberBg: '#FDF4E3',
  orange: '#C2610C',
  orangeBg: '#FDEEDF',
  grey: '#EEF1F4',
  bannerRedBg: '#FDECEC',
  bannerRedText: '#8C1F1F',
  bannerAmberText: '#6B4E00',
  bannerSuccessText: '#1B5E20',
};

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export const severityColor = (s: Severity) =>
  ({ low: colors.success, medium: colors.amber, high: colors.orange, critical: colors.red }[s]);
export const severityBg = (s: Severity) =>
  ({ low: colors.successBg, medium: colors.amberBg, high: colors.orangeBg, critical: colors.redGlow }[s]);
export const severityLabel = (s: Severity) =>
  ({ low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL' }[s]);
export const severityPillColor = (s: Severity) =>
  ({ low: 'success', medium: 'amber', high: 'orange', critical: 'red' } as const)[s];

export const radii = { sm: 11, md: 14, lg: 16, xl: 18, xxl: 24, pill: 100 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 26, xxxl: 32 };

// Poppins for headlines (weight 700/800), Inter for everything else.
// Falls back to system bold fonts if custom fonts aren't loaded — see hooks/useFonts.ts.
export const fonts = {
  heading: 'Poppins_700Bold',
  headingHeavy: 'Poppins_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const shadow = {
  card: {
    shadowColor: '#141E32',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sos: {
    shadowColor: colors.red,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

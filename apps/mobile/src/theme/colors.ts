export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  card: string;
  cardElevated: string;
  surface: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  headerBg: string;
  accent: string;
  white: string;
  black: string;
}

export const lightColors: ThemeColors = {
  primary: '#059669', // Emerald 600 - agricultural/growth feel
  primaryLight: '#10B981',
  primaryDark: '#047857',
  secondary: '#0284C7', // Sky blue
  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surface: '#F1F5F9', // Slate 100
  border: '#E2E8F0', // Slate 200
  borderLight: '#CBD5E1',
  text: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  headerBg: '#FFFFFF',
  accent: '#F59E0B', // Amber
  white: '#FFFFFF',
  black: '#000000'
};

export const darkColors: ThemeColors = {
  primary: '#10B981', // Emerald 500
  primaryLight: '#34D399',
  primaryDark: '#059669',
  secondary: '#38BDF8',
  background: '#0B0F19', // Deep Midnight
  card: '#131C2E', // Navy Slate
  cardElevated: '#1E293B',
  surface: '#1E293B',
  border: '#27354A',
  borderLight: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  headerBg: '#131C2E',
  accent: '#FBBF24',
  white: '#FFFFFF',
  black: '#000000'
};

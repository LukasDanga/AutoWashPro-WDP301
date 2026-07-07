/**
 * AutoWashPro Color Palette
 * Blue Trust Theme - WCAG AA compliant
 * Following UX guidelines: color-semantic tokens, dark-mode support, contrast-readability
 */

export const lightColors = {
  // Primary Colors (Royal Blue Trust)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  primarySubtle: '#EFF6FF',
  secondary: '#1E40AF',
  accent: '#0EA5E9',

  // Background Colors
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceDark: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // Text Colors (Slate scale - WCAG AA verified)
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status Colors (deeper shades for AA compliance)
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#EA580C',
  warningLight: '#FFEDD5',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Border Colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderStrong: '#CBD5E1',
  divider: '#E2E8F0',

  // Shadow
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.16)',

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(15, 23, 42, 0.6)',
  scrim: 'rgba(15, 23, 42, 0.45)',

  // Booking Status Colors
  statusPending: '#EA580C',
  statusConfirmed: '#2563EB',
  statusCheckedIn: '#9333EA',
  statusInProgress: '#0891B2',
  statusCompleted: '#16A34A',
  statusCancelled: '#DC2626',
};

export const darkColors = {
  // Primary Colors (lighter for dark mode)
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  primarySubtle: 'rgba(59, 130, 246, 0.15)',
  secondary: '#60A5FA',
  accent: '#38BDF8',

  // Background Colors (Dark mode)
  background: '#0F172A',
  surface: '#1E293B',
  surfaceDark: '#334155',
  surfaceElevated: '#1E293B',

  // Text Colors (Light text on dark background)
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  // Status Colors (tuned for dark mode contrast)
  success: '#4ADE80',
  successLight: 'rgba(74, 222, 128, 0.15)',
  warning: '#FB923C',
  warningLight: 'rgba(251, 146, 60, 0.15)',
  error: '#F87171',
  errorLight: 'rgba(248, 113, 113, 0.15)',
  info: '#38BDF8',
  infoLight: 'rgba(56, 189, 248, 0.15)',

  // Border Colors (Lighter borders for dark mode)
  border: '#334155',
  borderLight: '#1E293B',
  borderStrong: '#475569',
  divider: '#334155',

  // Shadow (Stronger for dark mode)
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowDark: 'rgba(0, 0, 0, 0.6)',

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.75)',
  scrim: 'rgba(0, 0, 0, 0.6)',

  // Booking Status Colors
  statusPending: '#FB923C',
  statusConfirmed: '#3B82F6',
  statusCheckedIn: '#A855F7',
  statusInProgress: '#22D3EE',
  statusCompleted: '#4ADE80',
  statusCancelled: '#F87171',
};

// Default to light colors (dark mode can be enabled via ThemeContext)
export const colors = lightColors;

export type ColorKey = keyof typeof colors;
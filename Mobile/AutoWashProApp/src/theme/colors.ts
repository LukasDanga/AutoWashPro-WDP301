/**
 * AutoWashPro Color Palette
 * Blue & White Theme
 */

export const colors = {
  // Primary Colors (Blue)
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#64B5F6',
  secondary: '#0D47A1',
  accent: '#42A5F5',

  // Background Colors
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceDark: '#EEEEEE',

  // Text Colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textInverse: '#FFFFFF',

  // Status Colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Booking Status Colors
  statusPending: '#FF9800',
  statusConfirmed: '#2196F3',
  statusCheckedIn: '#9C27B0',
  statusInProgress: '#00BCD4',
  statusCompleted: '#4CAF50',
  statusCancelled: '#F44336',
} as const;

export type ColorKey = keyof typeof colors;

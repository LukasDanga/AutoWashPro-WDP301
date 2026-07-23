/**
 * AutoWashPro Spacing System
 * Based on 4pt/8dp grid (Material Design)
 */

export const spacing = {
  // Base spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Specific spacing
  screenPadding: 20,
  cardPadding: 16,
  inputPadding: 14,
  buttonPadding: 18,

  // Section spacing
  sectionGap: 24,
  itemGap: 12,
  iconGap: 10,
} as const;

export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 10,
  },
} as const;

export const layout = {
  // Minimum touch target per Apple HIG / Material
  minTouchTarget: 44,
  // Common component radii (semantic shortcuts)
  cardRadius: 24,
  buttonRadius: 12,
  inputRadius: 12,
  chipRadius: 999,
  // Floating tab bar
  floatingTabBottomOffset: 12,
  floatingTabHorizontalPadding: 16,
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
export type LayoutKey = keyof typeof layout;
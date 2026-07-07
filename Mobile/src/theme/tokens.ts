/**
 * AutoWashPro Design Tokens
 * Centralized motion, opacity, and z-index tokens
 * Following UX guidelines: motion-consistency, duration-timing, z-index-management
 */

export const duration = {
  // Micro-interactions: 150-300ms per UX guidelines
  fast: 150,
  normal: 200,
  medium: 250,
  slow: 300,
  // Page transitions
  page: 350,
  // Loading shimmer
  shimmer: 1500,
} as const;

export const easing = {
  // ease-out for entering, ease-in for exiting
  enter: 'ease-out',
  exit: 'ease-in',
} as const;

export const opacity = {
  pressed: 0.7,
  disabled: 0.5,
  muted: 0.6,
  overlay: 0.5,
  scrim: 0.45,
  subtle: 0.7,
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  overlay: 100,
  modal: 1000,
  toast: 2000,
} as const;

// Scale transform values for press feedback (UX guideline: 0.95-1.05)
export const scale = {
  pressed: 0.97,
  pressedSmall: 0.95,
  pressedLarge: 0.98,
  released: 1,
} as const;

// Numeric elevation values for cross-platform consistency
export const elevation = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  xxl: 24,
} as const;

export type DurationKey = keyof typeof duration;
export type OpacityKey = keyof typeof opacity;
export type ZIndexKey = keyof typeof zIndex;
export type ScaleKey = keyof typeof scale;
export type ElevationKey = keyof typeof elevation;
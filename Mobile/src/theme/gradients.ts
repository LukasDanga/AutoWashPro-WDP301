/**
 * AutoWashPro Gradients
 * Reusable gradient definitions for hero banners, CTAs, and accents
 * Following UX guidelines: effects-match-style, brand consistency
 */

import { lightColors, darkColors } from './colors';

type GradientStop = {
  color: string;
  offset?: string;
};

// Build a single linear-gradient stop list from one or more color arrays
// (kept here so older call sites that pass duplicate arrays still work,
// while new code can pass a single array).
const linear = (...stops: [string, string?, string?][]): GradientStop[] =>
  stops.flatMap((s) =>
    s.map((color, i) => ({ color: color as string, offset: `${i / (s.length - 1)}` })),
  );

export const lightGradients = {
  // Primary: deep blue → bright blue (CTA / hero)
  primary: linear(['#1D4ED8', '#3B82F6']),

  // Welcome / hero banner (premium 3-stop)
  hero: linear(['#1E40AF', '#2563EB', '#0EA5E9']),

  // Sunset-ish accent for offers/voucher
  sunset: linear(['#F97316', '#FB923C']),

  // Loyalty gold
  gold: linear(['#F59E0B', '#FBBF24']),

  // Success
  success: linear(['#15803D', '#22C55E']),

  // Profile header
  profile: linear(['#1E40AF', '#2563EB', '#3B82F6']),

  // Subtle wash for surfaces
  subtle: linear(['#F8FAFC', '#F1F5F9']),
} as const;

export const darkGradients = {
  primary: linear(['#1E40AF', '#2563EB']),
  hero: linear(['#1E3A8A', '#1E40AF', '#2563EB']),
  sunset: linear(['#C2410C', '#F97316']),
  gold: linear(['#B45309', '#F59E0B']),
  success: linear(['#14532D', '#15803D']),
  profile: linear(['#1E3A8A', '#1E40AF', '#2563EB']),
  subtle: linear(['#1E293B', '#0F172A']),
} as const;

export type GradientKey = keyof typeof lightGradients;
export type GradientDirection = 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';

/**
 * Convert a gradient stop list (GradientStop[]) into the flat string[]
 * expected by expo-linear-gradient's `colors` prop.
 * Safe against undefined inputs to avoid runtime crashes.
 */
export const toGradientColors = (
  stops: ReadonlyArray<GradientStop> | undefined | null,
): string[] => {
  if (!stops || stops.length === 0) {
    return ['#1D4ED8', '#3B82F6'];
  }
  return stops.map((s) => s.color);
};

/**
 * Return a gradient set for the current theme (light/dark).
 * Falls back to light gradients when `isDark` is falsy.
 */
export const getGradients = (isDark: boolean) =>
  isDark ? darkGradients : lightGradients;
/**
 * AutoWashPro Typography System
 * Modern Minimal + Premium scale, WCAG-friendly
 * Includes tabular-nums for price/amount columns
 */

import { TextStyle, Platform } from 'react-native';

// Font families mapped to weights
const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  displayRegular: 'Outfit_400Regular',
  displayMedium: 'Outfit_500Medium',
  displaySemiBold: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
};

// Tabular-nums helper for stable number rendering (prices, timers)
const tabular: TextStyle = {
  fontVariant: ['tabular-nums'],
} as TextStyle;

export const typography = {
  // Display (for hero numbers, large balances)
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -0.6,
  } as TextStyle,

  displaySm: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
  } as TextStyle,

  // Headings
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,

  h3: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,

  h4: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,

  // Body
  bodyLarge: {
    fontFamily: fonts.regular,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
  } as TextStyle,

  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  // Caption
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,

  // Button
  button: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.3,
  } as TextStyle,

  buttonSmall: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.3,
  } as TextStyle,

  // Label
  label: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  } as TextStyle,

  labelSmall: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  } as TextStyle,

  // Overline
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Numeric / price (uses tabular-nums to prevent layout shift)
  price: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
    ...tabular,
  } as TextStyle,

  priceLarge: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
    ...tabular,
  } as TextStyle,

  priceSmall: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    ...tabular,
  } as TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
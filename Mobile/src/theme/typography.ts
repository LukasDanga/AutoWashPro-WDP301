/**
 * AutoWashPro Typography System
 * Modern Minimal + Premium scale, WCAG-friendly
 * Includes tabular-nums for price/amount columns
 */

import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

// Tabular-nums helper for stable number rendering (prices, timers)
const tabular: TextStyle = {
  fontVariant: ['tabular-nums'],
} as TextStyle;

export const typography = {
  // Display (for hero numbers, large balances)
  display: {
    fontFamily,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -0.6,
  } as TextStyle,

  displaySm: {
    fontFamily,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
  } as TextStyle,

  // Headings
  h1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,

  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,

  h4: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,

  // Body
  bodyLarge: {
    fontFamily,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
  } as TextStyle,

  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  // Caption
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,

  // Button
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.3,
  } as TextStyle,

  buttonSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.3,
  } as TextStyle,

  // Label
  label: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  } as TextStyle,

  labelSmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  } as TextStyle,

  // Overline
  overline: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Numeric / price (uses tabular-nums to prevent layout shift)
  price: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
    ...tabular,
  } as TextStyle,

  priceLarge: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
    ...tabular,
  } as TextStyle,

  priceSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    ...tabular,
  } as TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
/**
 * AutoWashPro Theme
 * Central export for all theme values
 */

export { colors, lightColors, darkColors, type ColorKey } from './colors';
export { typography, type TypographyKey } from './typography';
export {
  spacing,
  borderRadius,
  shadows,
  layout,
  type SpacingKey,
  type BorderRadiusKey,
  type ShadowKey,
  type LayoutKey,
} from './spacing';
export { ThemeProvider, useTheme, useColors } from './ThemeContext';
export {
  duration,
  easing,
  opacity,
  zIndex,
  scale,
  elevation,
  type DurationKey,
  type OpacityKey,
  type ZIndexKey,
  type ScaleKey,
  type ElevationKey,
} from './tokens';
export {
  lightGradients,
  darkGradients,
  toGradientColors,
  getGradients,
  type GradientKey,
  type GradientDirection,
} from './gradients';
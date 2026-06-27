/**
 * AutoWashPro Theme
 * Central export for all theme values
 */

export { colors, type ColorKey } from './colors';
export { typography, type TypographyKey } from './typography';
export {
  spacing,
  borderRadius,
  shadows,
  type SpacingKey,
  type BorderRadiusKey,
  type ShadowKey,
} from './spacing';

// Combined theme object for convenience
export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  shadows: require('./spacing').shadows,
} as const;

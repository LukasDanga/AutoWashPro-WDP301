/**
 * AutoWashPro Text Component
 * Typography wrapper with theme + dark-mode support
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography, TypographyKey } from '../../theme/typography';
import { useColors } from '../../theme/ThemeContext';
import { ColorKey } from '../../theme/colors';

type TextVariant = TypographyKey;
type TextColor = ColorKey;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor | string;
  align?: 'left' | 'center' | 'right';
  weight?: '400' | '500' | '600' | '700';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
  weight,
  style,
  children,
  ...props
}) => {
  const colors = useColors();

  const getColor = () => {
    if (color in colors) {
      return (colors as any)[color as TextColor];
    }
    return color;
  };

  const variantStyle = typography[variant] as any;
  const weightStyle = weight ? { fontWeight: weight } : {};

  return (
    <RNText
      style={[
        variantStyle,
        weightStyle,
        { color: getColor(), textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default Text;
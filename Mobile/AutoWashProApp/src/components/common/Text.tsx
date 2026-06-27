/**
 * AutoWashPro Text Component
 * Typography wrapper with theme support
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography, TypographyKey } from '../../theme/typography';
import { colors } from '../../theme/colors';

type TextVariant = TypographyKey;
type TextColor = keyof typeof colors;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor | string;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const getColor = () => {
    if (color in colors) {
      return colors[color as TextColor];
    }
    return color;
  };

  return (
    <RNText
      style={[
        typography[variant],
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

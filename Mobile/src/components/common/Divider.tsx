/**
 * AutoWashPro Divider Component
 * Horizontal/vertical separator with optional dashed style
 * Following UX guidelines: section separation, semantic spacing
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

interface DividerProps {
  style?: ViewStyle;
  margin?: keyof typeof spacing | number;
  thickness?: number;
  color?: string;
  orientation?: 'horizontal' | 'vertical';
  inset?: number;
}

export const Divider: React.FC<DividerProps> = ({
  style,
  margin = 'md',
  thickness = StyleSheet.hairlineWidth,
  color,
  orientation = 'horizontal',
  inset = 0,
}) => {
  const colors = useColors();
  const marginValue = typeof margin === 'number' ? margin : spacing[margin] || spacing.md;
  const lineColor = color ?? colors.divider;

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          {
            width: thickness,
            backgroundColor: lineColor,
            marginHorizontal: marginValue / 2,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: lineColor,
          marginVertical: marginValue,
          marginHorizontal: inset,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({});

export default Divider;
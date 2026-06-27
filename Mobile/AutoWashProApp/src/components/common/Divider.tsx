/**
 * AutoWashPro Divider Component
 * Horizontal separator line
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface DividerProps {
  style?: ViewStyle;
  margin?: keyof typeof spacing | number;
}

export const Divider: React.FC<DividerProps> = ({
  style,
  margin = 'md',
}) => {
  const marginValue = typeof margin === 'number' ? margin : spacing[margin] || spacing.md;

  return (
    <View
      style={[
        styles.divider,
        { marginVertical: marginValue },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    width: '100%',
  },
});

export default Divider;

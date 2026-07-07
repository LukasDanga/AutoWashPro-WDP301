/**
 * AutoWashPro ScreenContainer
 * Standard wrapper for screens — handles safe area, padding, optional gradient bg, scroll behavior.
 * Following UX guidelines: safe-area-awareness, mobile-first, screen-container consistency.
 */

import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useTheme } from '../../theme/ThemeContext';
import { toGradientColors, getGradients } from '../../theme/gradients';

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement;
  padded?: boolean;
  background?: 'solid' | 'gradient' | 'subtle';
  edges?: ReadonlyArray<Edge>;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  bottomPadding?: number;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scroll = false,
  refreshControl,
  padded = true,
  background = 'solid',
  edges = ['top', 'left', 'right'],
  keyboardAvoiding = false,
  contentStyle,
  style,
  showsVerticalScrollIndicator = false,
  bottomPadding = 0,
}) => {
  const colors = useColors();
  const { isDark } = useTheme();
  const gradients = getGradients(isDark);

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: background === 'solid' ? colors.background : 'transparent',
  };

  const paddingStyle: ViewStyle = padded
    ? { paddingHorizontal: 20 }
    : {};

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        paddingStyle,
        { paddingBottom: bottomPadding + 24 },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={refreshControl as any}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, paddingStyle, contentStyle, { paddingBottom: bottomPadding }]}>
      {children}
    </View>
  );

  const inner = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  const statusBarProps = {
    barStyle: (colors.textPrimary === '#F1F5F9' ? 'light-content' : 'dark-content') as 'light-content' | 'dark-content',
    backgroundColor: 'transparent',
    translucent: true,
  };

  if (background === 'gradient') {
    return (
      <View style={containerStyle}>
        <StatusBar {...statusBarProps} />
        <LinearGradient
          colors={toGradientColors(gradients.hero)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.flex, style]}
        >
          <SafeAreaView style={styles.flex} edges={edges}>
            {inner}
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (background === 'subtle') {
    return (
      <View style={[containerStyle, { backgroundColor: colors.surface }]}>
        <StatusBar {...statusBarProps} />
        <SafeAreaView style={[styles.flex, style]} edges={edges}>
          {inner}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <StatusBar {...statusBarProps} />
      <SafeAreaView style={styles.flex} edges={edges}>
        {inner}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default ScreenContainer;
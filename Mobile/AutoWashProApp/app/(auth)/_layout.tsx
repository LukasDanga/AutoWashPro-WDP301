/**
 * AutoWashPro Auth Layout
 * Layout for authentication screens
 */

import { Stack } from 'expo-router';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function AuthLayout() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

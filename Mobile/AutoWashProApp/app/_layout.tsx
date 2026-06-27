/**
 * AutoWashPro Root Layout
 * Entry point for Expo Router
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          {/* Auth Stack */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Main App Stack (Tabs) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Booking Stack */}
          <Stack.Screen
            name="booking"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />

          {/* Notifications Stack */}
          <Stack.Screen
            name="notifications"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />

          {/* Other Stacks */}
          <Stack.Screen name="branch" options={{ headerShown: false }} />
          <Stack.Screen name="voucher" options={{ headerShown: false }} />
          <Stack.Screen name="vehicle" options={{ headerShown: false }} />
          <Stack.Screen name="payment" options={{ headerShown: false }} />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}

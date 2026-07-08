/**
 * AutoWashPro Root Layout
 * Entry point for Expo Router
 * Following UX guidelines: dark-mode support, status-bar-adaptation, toast wrapper
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { BookingProvider } from '../src/contexts/BookingContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { ToastProvider, registerToastBridge } from '../src/components/common/Toast';
import { AlertDialogProvider, registerAlertBridge, useAlertDialog } from '../src/components/common/AlertDialog';

function RootLayoutContent() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="checkin" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function AlertBridgeRegistrar({ children }: { children: React.ReactNode }) {
  const alert = useAlertDialog();
  registerAlertBridge(alert.show);
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BookingProvider>
            <AlertDialogProvider>
              <ToastProvider>
                <AlertBridgeRegistrar>
                  <RootLayoutContent />
                </AlertBridgeRegistrar>
              </ToastProvider>
            </AlertDialogProvider>
          </BookingProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

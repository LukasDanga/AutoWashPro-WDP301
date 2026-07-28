/**
 * AutoWashPro Payment Stack Layout
 * Ensures payment screens (detail, checkout, select, history) run as a dedicated Stack,
 * hiding the bottom tab navigation bar when active.
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="detail" />
      <Stack.Screen name="history" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="select" />
    </Stack>
  );
}

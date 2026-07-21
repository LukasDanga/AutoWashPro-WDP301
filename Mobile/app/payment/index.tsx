/**
 * AutoWashPro Payment Screen
 *
 * This screen is the legacy payment entry-point. The current implementation
 * lives in `app/payment/select.tsx`, which supports MoMo / VNPay redirects,
 * bank-QR polling and deposit handling. Redirect on mount to keep older
 * deep-links working (e.g. `/payment?bookingId=...`).
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../src/components/common';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Preserve bookingId / amount on the redirect so the target screen can
    // bootstrap its state without asking the user to re-select.
    router.replace({
      pathname: '/payment/select',
      params: params as Record<string, string>,
    });
  }, [router, params]);

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

/**
 * AutoWashPro Payment Screen
 * Select payment method and process payment
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Button,
  Loading,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';

type PaymentMethod = 'cash' | 'momo' | 'vnpay';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'momo',
    name: 'MoMo',
    icon: '💜',
    description: 'Thanh toán qua ví MoMo',
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    icon: '💳',
    description: 'Thanh toán qua VNPay',
  },
  {
    id: 'cash',
    name: 'Tiền mặt',
    icon: '💵',
    description: 'Thanh toán trực tiếp tại chi nhánh',
  },
];

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingId, setBookingId] = useState<string>(params.bookingId as string || '');

  const handlePayment = async () => {
    if (!bookingId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đặt lịch');
      return;
    }

    setIsProcessing(true);
    try {
      // Create payment
      const payment = await paymentApi.createPayment({
        bookingId,
        paymentMethod: selectedMethod,
      });

      if (selectedMethod === 'cash') {
        // Cash payment - just confirm
        Alert.alert(
          'Thành công',
          'Đặt lịch thành công! Vui lòng thanh toán tiền mặt khi đến chi nhánh.',
          [
            {
              text: 'Xem chi tiết',
              onPress: () => router.replace(`/booking/${bookingId}`),
            },
          ]
        );
      } else {
        // MoMo or VNPay - redirect to payment gateway
        // In a real app, this would open the payment URL
        Alert.alert(
          'Đang xử lý',
          `Đang chuyển hướng đến thanh toán ${selectedMethod === 'momo' ? 'MoMo' : 'VNPay'}...`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Simulate payment success for demo
                router.replace(`/booking/${bookingId}`);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể xử lý thanh toán'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Thanh toán</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>🔒</Text>
          <AppText variant="body" color="textSecondary">
            Vui lòng đăng nhập để thanh toán
          </AppText>
          <Button
            title="Đăng nhập"
            onPress={() => router.push('/(auth)/login')}
            style={styles.loginButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Phương thức thanh toán</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <Card style={styles.summaryCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Thông tin thanh toán
          </AppText>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>📋</Text>
            <View style={styles.summaryContent}>
              <AppText variant="bodySmall" color="textSecondary">
                Mã đặt lịch
              </AppText>
              <AppText variant="body">
                {bookingId ? `#${bookingId.slice(-8).toUpperCase()}` : 'N/A'}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Payment Methods */}
        <AppText variant="h4" style={styles.sectionTitle}>
          Chọn phương thức thanh toán
        </AppText>

        {PAYMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setSelectedMethod(option.id)}
          >
            <Card
              style={[
                styles.paymentCard,
                selectedMethod === option.id && styles.paymentCardSelected,
              ]}
            >
              <View style={styles.paymentContent}>
                <View style={styles.paymentIcon}>
                  <Text style={styles.paymentEmoji}>{option.icon}</Text>
                </View>
                <View style={styles.paymentInfo}>
                  <AppText variant="body" style={styles.paymentName}>
                    {option.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {option.description}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMethod === option.id && styles.radioSelected,
                  ]}
                >
                  {selectedMethod === option.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Payment Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <AppText variant="body" style={styles.infoTitle}>
              Thông tin thanh toán
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary" style={styles.infoText}>
            {selectedMethod === 'cash' && 'Thanh toán bằng tiền mặt tại chi nhánh khi đến rửa xe.'}
            {selectedMethod === 'momo' && 'Bạn sẽ được chuyển đến ứng dụng MoMo để hoàn tất thanh toán.'}
            {selectedMethod === 'vnpay' && 'Bạn sẽ được chuyển đến cổng thanh toán VNPay để hoàn tất thanh toán.'}
          </AppText>
        </Card>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <AppText variant="caption" color="textSecondary" style={styles.securityText}>
            Thanh toán an toàn và bảo mật. AutoWashPro không lưu trữ thông tin thẻ của bạn.
          </AppText>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <Button
          title={
            selectedMethod === 'cash'
              ? 'Xác nhận đặt lịch'
              : `Thanh toán qua ${PAYMENT_OPTIONS.find((o) => o.id === selectedMethod)?.name}`
          }
          onPress={handlePayment}
          loading={isProcessing}
          disabled={!bookingId}
          fullWidth
          size="large"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  paymentCard: {
    marginBottom: spacing.sm,
  },
  paymentCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentEmoji: {
    fontSize: 24,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  infoCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.infoLight,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  infoTitle: {
    fontWeight: '600',
  },
  infoText: {
    lineHeight: 22,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  securityIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  securityText: {
    flex: 1,
    lineHeight: 20,
  },
  bottomAction: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

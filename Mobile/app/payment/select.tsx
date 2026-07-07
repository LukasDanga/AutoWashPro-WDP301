/**
 * AutoWashPro Payment Method Selector Screen
 * Select payment method for booking
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  Icon,
  ScreenContainer,
  Header,
  EmptyState,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

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
    icon: 'phone-portrait-outline',
    description: 'Thanh toán qua ví MoMo',
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    icon: 'card-outline',
    description: 'Thanh toán qua VNPay',
  },
  {
    id: 'cash',
    name: 'Tiền mặt',
    icon: 'cash-outline',
    description: 'Thanh toán trực tiếp tại chi nhánh',
  },
];

export default function PaymentSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const toast = useToast();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const bookingId = params.bookingId as string | undefined;

  const handlePayment = async () => {
    if (!bookingId) {
      AlertDialog.error('Lỗi', 'Không tìm thấy thông tin đặt lịch');
      return;
    }

    setIsProcessing(true);
    try {
      const payment = await paymentApi.createPayment({
        bookingId,
        paymentMethod: selectedMethod,
      });

      if (selectedMethod === 'cash') {
        toast.success(
          'Đặt lịch thành công',
          'Vui lòng thanh toán tiền mặt khi đến chi nhánh',
        );
        setTimeout(() => router.replace(`/booking/${bookingId}`), 600);
      } else {
        AlertDialog.show({
          title: 'Đang xử lý',
          message: `Đang chuyển hướng đến thanh toán ${selectedMethod === 'momo' ? 'MoMo' : 'VNPay'}...`,
          variant: 'info',
          actions: [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => router.replace(`/booking/${bookingId}`), 50);
              },
            },
          ],
        });
      }
    } catch (error: any) {
      AlertDialog.error(
        'Thanh toán thất bại',
        error.response?.data?.message || 'Không thể xử lý thanh toán. Vui lòng thử lại.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header title="Chọn thanh toán" showBack />
        <EmptyState
          iconName="lock-closed-outline"
          title="Vui lòng đăng nhập"
          message="Đăng nhập để chọn phương thức thanh toán"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Chọn thanh toán" showBack />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Methods */}
        <AppText variant="h4" style={styles.sectionTitle}>
          Phương thức thanh toán
        </AppText>

        {PAYMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setSelectedMethod(option.id)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.paymentCard,
                selectedMethod === option.id && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={styles.paymentContent}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.primarySubtle }]}>
                  <Icon name={option.icon} size={24} color={colors.primary} />
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
                    { borderColor: colors.border },
                    selectedMethod === option.id && { borderColor: colors.primary },
                  ]}
                >
                  {selectedMethod === option.id && (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Payment Info */}
        <Card style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <View style={styles.infoHeader}>
            <Icon name="information-circle-outline" size={20} color={colors.info} />
            <AppText variant="body" style={styles.infoTitle}>
              Lưu ý
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
          <Icon name="shield-checkmark-outline" size={18} color={colors.success} />
          <AppText variant="caption" color="textSecondary" style={styles.securityText}>
            Thanh toán an toàn và bảo mật
          </AppText>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  paymentCard: {
    marginBottom: spacing.sm,
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoCard: {
    marginTop: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
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
    gap: spacing.sm,
  },
  securityText: {
    flex: 1,
    lineHeight: 20,
  },
  bottomAction: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
});

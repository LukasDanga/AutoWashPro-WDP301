/**
 * AutoWashPro Payment Screen
 * Select payment method and process payment
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  Loading,
  Icon,
  Icons,
  PressableScale,
  ScreenContainer,
  Header,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
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
    icon: Icons.cardOutline,
    description: 'Thanh toán qua ví MoMo',
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    icon: Icons.cardOutline,
    description: 'Thanh toán qua VNPay',
  },
  {
    id: 'cash',
    name: 'Tiền mặt',
    icon: Icons.walletOutline,
    description: 'Thanh toán trực tiếp tại chi nhánh',
  },
];

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const toast = useToast();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingId, setBookingId] = useState<string>(params.bookingId as string || '');

  const handlePayment = async () => {
    if (!bookingId) {
      AlertDialog.error('Lỗi', 'Không tìm thấy thông tin đặt lịch');
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
        toast.success(
          'Đặt lịch thành công',
          'Vui lòng thanh toán tiền mặt khi đến chi nhánh',
        );
        setTimeout(() => router.replace(`/booking/${bookingId}`), 600);
      } else {
        // MoMo or VNPay - simulate gateway redirect
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
        <Header title="Thanh toán" showBack />
        <View style={styles.centerContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}>
            <Icon name={Icons.lockOutline} size={32} color={colors.warning} />
          </View>
          <AppText variant="body" color="textSecondary">
            Vui lòng đăng nhập để thanh toán
          </AppText>
          <Button
            title="Đăng nhập"
            onPress={() => router.push('/(auth)/login' as any)}
            style={styles.loginButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Phương thức thanh toán" showBack />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <Card style={styles.summaryCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Thông tin thanh toán
          </AppText>
          <View style={styles.summaryRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.receiptOutline} size={20} color={colors.primary} />
            </View>
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

        {PAYMENT_OPTIONS.map((option) => {
          const selected = selectedMethod === option.id;
          return (
            <PressableScale
              key={option.id}
              onPress={() => setSelectedMethod(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.name}. ${option.description}`}
            >
              <Card
                style={[
                  styles.paymentCard,
                  selected && {
                    borderColor: colors.primary,
                    borderWidth: 2,
                    backgroundColor: colors.primarySubtle,
                  },
                ]}
              >
                <View style={styles.paymentContent}>
                  <View
                    style={[
                      styles.paymentIcon,
                      {
                        backgroundColor: selected ? colors.primary : colors.primarySubtle,
                      },
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      size={24}
                      color={selected ? colors.textInverse : colors.primary}
                    />
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
                      { borderColor: selected ? colors.primary : colors.border },
                    ]}
                  >
                    {selected ? (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    ) : null}
                  </View>
                </View>
              </Card>
            </PressableScale>
          );
        })}

        {/* Payment Info */}
        <Card style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <View style={styles.infoHeader}>
            <Icon name={Icons.info} size={20} color={colors.info} />
            <AppText variant="body" style={styles.infoTitle}>
              Thông tin thanh toán
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary" style={styles.infoText}>
            {selectedMethod === 'cash'
              ? 'Thanh toán bằng tiền mặt tại chi nhánh khi đến rửa xe.'
              : selectedMethod === 'momo'
              ? 'Bạn sẽ được chuyển đến ứng dụng MoMo để hoàn tất thanh toán.'
              : 'Bạn sẽ được chuyển đến cổng thanh toán VNPay để hoàn tất thanh toán.'}
          </AppText>
        </Card>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Icon name={Icons.shield} size={18} color={colors.success} />
          <AppText variant="caption" color="textSecondary" style={styles.securityText}>
            Thanh toán an toàn và bảo mật. AutoWashPro không lưu trữ thông tin thẻ của bạn.
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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

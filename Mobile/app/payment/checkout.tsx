import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi, bookingApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  ScreenContainer,
  Header,
  EmptyState,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { PaymentType } from '../../src/types';

type CheckoutStep = 'amount' | 'qr' | 'success';

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const toast = useToast();

  const bookingId = (params.bookingId as string) || '';

  const [step, setStep] = useState<CheckoutStep>('amount');
  const [booking, setBooking] = useState<any>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState('');
  const [paymentMode, setPaymentMode] = useState<'deposit' | 'full'>('deposit');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!bookingId) {
        setIsLoadingBooking(false);
        return;
      }
      setIsLoadingBooking(true);
      try {
        const b = await bookingApi.getBooking(bookingId);
        if (!cancelled) setBooking(b);
      } catch (err: any) {
        if (!cancelled) {
          toast.error('Lỗi', 'Không tải được thông tin đặt lịch');
        }
      } finally {
        if (!cancelled) setIsLoadingBooking(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bookingId]);

  const totalAmount = useMemo(() => {
    if (!booking) return 0;
    return booking.finalPrice ?? booking.totalPrice ?? 0;
  }, [booking]);

  const depositAmount = useMemo(() => {
    if (!booking) return 0;
    return Math.round((totalAmount * 0.3) / 1000) * 1000;
  }, [booking, totalAmount]);

  const amount = useMemo(() => {
    if (paymentMode === 'full') return totalAmount;
    return depositAmount;
  }, [paymentMode, totalAmount, depositAmount]);

  const remainingAmount = useMemo(() => {
    if (paymentMode === 'full') return 0;
    return Math.max(0, totalAmount - depositAmount);
  }, [paymentMode, totalAmount, depositAmount]);

  const handleCreatePayment = async () => {
    if (!bookingId) return;
    setIsProcessing(true);
    setError('');
    try {
      const p = await paymentApi.createPayment({
        bookingId,
        paymentMethod: 'bank',
        type: paymentMode === 'full' ? 'full' : 'deposit',
      });
      setPayment(p);
      setStep('qr');
      setPollCount(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll payment status when QR is shown
  useEffect(() => {
    if (step !== 'qr' || !payment) return;
    const interval = setInterval(async () => {
      try {
        const p = await paymentApi.getPaymentByBooking(bookingId);
        if (p?.status === 'completed' || (p as any)?.status === 'paid') {
          clearInterval(interval);
          setStep('success');
        }
        setPollCount(c => c + 1);
      } catch (e) { /* ignore polling errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, payment, bookingId]);

  const handleConfirmTransfer = async () => {
    if (!payment) return;
    setIsProcessing(true);
    try {
      await paymentApi.simulatePayment({
        transactionId: payment.transactionId,
        gatewayTransactionId: `SIM${Date.now()}`,
        success: true,
      });
      setStep('success');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể xác nhận thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)/history' as any);
  };

  const handleCancel = () => {
    setPayment(null);
    setStep('amount');
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header title="Thanh toán" showBack />
        <EmptyState
          iconName="lock-closed-outline"
          title="Vui lòng đăng nhập"
          message="Đăng nhập để thanh toán"
        />
      </ScreenContainer>
    );
  }

  if (isLoadingBooking) {
    return (
      <ScreenContainer>
        <Header title="Thanh toán" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!booking) {
    return (
      <ScreenContainer>
        <Header title="Thanh toán" showBack />
        <EmptyState
          iconName="alert-circle-outline"
          title="Không tìm thấy đơn"
          message="Đơn đặt lịch không tồn tại hoặc đã bị xoá."
          actionLabel="Về lịch sử"
          onAction={() => router.replace('/(tabs)/history' as any)}
        />
      </ScreenContainer>
    );
  }

  // ------- Step: SUCCESS -------
  if (step === 'success') {
    return (
      <ScreenContainer>
        <Header title="Thanh toán thành công" />
        <View style={styles.center}>
          <Card style={[styles.successCard, { backgroundColor: colors.successLight }]}>
            <View style={[styles.successIconWrap, { backgroundColor: colors.success }]}>
              <AppText style={styles.successIcon}>✓</AppText>
            </View>
            <AppText variant="h2" style={styles.successTitle}>
              {paymentMode === 'full' ? 'Thanh toán thành công!' : 'Đặt cọc thành công!'}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.successDesc}>
              Cảm ơn bạn, lịch hẹn đã được xác nhận.
            </AppText>
          </Card>
        </View>
        <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button title="Xem lịch sử đặt" onPress={handleDone} fullWidth size="large" />
        </View>
      </ScreenContainer>
    );
  }

  // ------- Step: QR -------
  if (step === 'qr' && payment?.qrCode) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.qrHeader}>
            <View style={[styles.qrIconWrap, { backgroundColor: colors.successLight }]}>
              <AppText style={styles.qrIcon}>💳</AppText>
            </View>
            <AppText variant="h3" style={styles.qrTitle}>Chuyển khoản ngân hàng</AppText>
            <AppText variant="body" color="textSecondary" style={styles.qrSubtitle}>
              Quét mã QR bằng app ngân hàng bất kỳ
            </AppText>
          </View>

          <View style={styles.qrImageWrap}>
            <View style={[styles.qrImageBorder, { borderColor: colors.border }]}>
              <Image
                source={{ uri: payment.qrCode }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Card style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surface }}>
            <View style={styles.summaryRow}>
              <AppText variant="body" color="textSecondary">Số tiền cần chuyển</AppText>
              <AppText variant="h2" color="primary">{formatCurrency(amount)}</AppText>
            </View>
            {remainingAmount > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <AppText variant="body" color="textSecondary">Còn lại (thanh toán sau)</AppText>
                  <AppText variant="body" color="textTertiary">{formatCurrency(remainingAmount)}</AppText>
                </View>
              </>
            )}
          </Card>

          {payment.transactionId && (
            <Card style={[styles.txnCard, { backgroundColor: colors.surface }]}>
              <View style={styles.txnRow}>
                <AppText variant="caption" color="textSecondary">Mã giao dịch</AppText>
                <AppText variant="body" style={styles.txnValue}>{payment.transactionId}</AppText>
              </View>
            </Card>
          )}

          <AppText variant="caption" color="textTertiary" style={styles.pollingText}>
            {pollCount % 2 === 0 ? '⏳' : '⏳'} Đang kiểm tra thanh toán...
          </AppText>
        </ScrollView>

        <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button
            title="Đã chuyển khoản"
            onPress={handleConfirmTransfer}
            loading={isProcessing}
            fullWidth
            size="large"
            style={{ backgroundColor: '#10b981' }}
          />
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <AppText variant="body" color="textSecondary">Hủy</AppText>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ------- Step: AMOUNT (default) -------
  return (
    <ScreenContainer>
      <Header title="Thanh toán" showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.warningLight }]}>
            <AppText style={styles.headerIcon}>💰</AppText>
          </View>
          <AppText variant="h2" style={styles.headerTitle}>Thanh toán</AppText>
          <AppText variant="body" color="textSecondary" style={styles.headerSubtitle}>
            Vui lòng thanh toán để hoàn tất đặt lịch
          </AppText>
        </View>

        {error ? (
          <Card style={[styles.errorCard, { backgroundColor: colors.errorLight }]}>
            <AppText variant="body" color="error">{error}</AppText>
          </Card>
        ) : null}

        <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <AppText variant="body" color="textSecondary">Tổng dịch vụ</AppText>
            <AppText variant="body" style={styles.summaryValue}>{formatCurrency(totalAmount)}</AppText>
          </View>
          {paymentMode === 'deposit' && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <AppText variant="body" color="textSecondary">Còn lại (thanh toán sau)</AppText>
                <AppText variant="body" color="textTertiary">{formatCurrency(remainingAmount)}</AppText>
              </View>
            </>
          )}
        </Card>

        <AppText variant="label" color="textSecondary" style={styles.amountSectionLabel}>
          SỐ TIỀN CẦN THANH TOÁN
        </AppText>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              paymentMode === 'deposit' && { borderColor: '#d97706', backgroundColor: '#fffbeb' },
            ]}
            onPress={() => setPaymentMode('deposit')}
            activeOpacity={0.7}
          >
            <AppText
              variant="body"
              style={[
                styles.modeLabel,
                { color: paymentMode === 'deposit' ? '#d97706' : colors.textSecondary },
              ]}
            >
              Thanh toán cọc 30%
            </AppText>
            <AppText
              variant="h3"
              style={[
                styles.modeAmount,
                { color: paymentMode === 'deposit' ? '#d97706' : colors.textPrimary },
              ]}
            >
              {formatCurrency(depositAmount)}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              paymentMode === 'full' && { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
            ]}
            onPress={() => setPaymentMode('full')}
            activeOpacity={0.7}
          >
            <AppText
              variant="body"
              style={[
                styles.modeLabel,
                { color: paymentMode === 'full' ? '#10b981' : colors.textSecondary },
              ]}
            >
              Thanh toán 100%
            </AppText>
            <AppText
              variant="h3"
              style={[
                styles.modeAmount,
                { color: paymentMode === 'full' ? '#10b981' : colors.textPrimary },
              ]}
            >
              {formatCurrency(totalAmount)}
            </AppText>
          </TouchableOpacity>
        </View>

        <Card style={[styles.methodCard, { backgroundColor: colors.surface }]}>
          <AppText variant="label" color="textSecondary" style={styles.methodLabel}>
            PHƯƠNG THỨC THANH TOÁN
          </AppText>
          <View style={styles.methodRow}>
            <View style={[styles.methodIconWrap, { backgroundColor: '#10b981' }]}>
              <AppText style={styles.methodIconText}>🏦</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={styles.methodName}>Ngân hàng</AppText>
              <AppText variant="caption" color="textTertiary">Chuyển khoản qua mã QR</AppText>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={`Thanh toán ${formatCurrency(amount)}`}
          onPress={handleCreatePayment}
          loading={isProcessing}
          disabled={amount <= 0}
          fullWidth
          size="large"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  errorCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryValue: {
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: spacing.xs,
  },
  amountSectionLabel: {
    marginBottom: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modeAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  methodCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  methodLabel: {
    marginBottom: spacing.sm,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  methodIconText: {
    fontSize: 18,
  },
  methodName: {
    fontWeight: '600',
  },
  qrHeader: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  qrIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  qrIcon: {
    fontSize: 28,
  },
  qrTitle: {
    marginBottom: spacing.xs,
  },
  qrSubtitle: {
    textAlign: 'center',
  },
  qrImageWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrImageBorder: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    padding: spacing.sm,
  },
  qrImage: {
    width: 240,
    height: 240,
  },
  qrDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: spacing.xs,
  },
  txnCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnValue: {
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  pollingText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
  },
  successTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successDesc: {
    textAlign: 'center',
  },
  bottomAction: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});

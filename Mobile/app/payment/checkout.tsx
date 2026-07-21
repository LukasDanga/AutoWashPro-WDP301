import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  AppState,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useBooking } from '../../src/contexts/BookingContext';
import { paymentApi, bookingApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  ScreenContainer,
  Header,
  EmptyState,
  Icon,
  Icons,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Booking, Branch, Package, Vehicle } from '../../src/types';

type CheckoutStep = 'amount' | 'qr' | 'vnpay_pending' | 'success';
type PaymentMode = 'deposit' | 'full';
type PayMethod = 'bank' | 'vnpay';

function nameOf(value: string | { name?: string } | null | undefined): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.name || '—';
}

function plateOf(value: string | Vehicle | null | undefined): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.licensePlate || '—';
}

function formatBookingDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const toast = useToast();

  const rawBookingId = params.bookingId;
  const bookingId = Array.isArray(rawBookingId) ? rawBookingId[0] : (rawBookingId || '');
  const rawType = params.type;
  const paramType = Array.isArray(rawType) ? rawType[0] : (rawType || '');
  const rawVnpayResult = params.vnpay_result;
  const vnpayResultParam = Array.isArray(rawVnpayResult) ? rawVnpayResult[0] : (rawVnpayResult || undefined);

  // Provisional mode: no bookingId means payment-first (booking created after payment)
  const isProvisional = !bookingId;
  const isRecurringType = paramType === 'recurring';

  // BookingContext for single booking draft
  const bookingCtx = useBooking();

  // Recurring draft loaded from AsyncStorage
  const [recurringDraft, setRecurringDraft] = useState<any>(null);

  const [step, setStep] = useState<CheckoutStep>(vnpayResultParam ? 'vnpay_pending' : 'amount');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('bank');
  const [vnpayUrl, setVnpayUrl] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string>('');
  const [checkoutExtras, setCheckoutExtras] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!bookingId) {
        // Provisional mode: load recurring draft from AsyncStorage if needed
        if (isRecurringType) {
          try {
            const raw = await AsyncStorage.getItem('aw_recurring_draft');
            if (!cancelled && raw) setRecurringDraft(JSON.parse(raw));
          } catch { /* ignore */ }
        }
        // Load checkout extras (sub-services, voucher) for single booking
        try {
          const raw = await AsyncStorage.getItem('aw_checkout_extras');
          if (!cancelled && raw) setCheckoutExtras(JSON.parse(raw));
        } catch { /* ignore */ }
        setIsLoadingBooking(false);
        return;
      }
      setIsLoadingBooking(true);
      try {
        const b = await bookingApi.getBooking(bookingId);
        if (!cancelled) setBooking(b);
      } catch {
        if (!cancelled) toast.error('Lỗi', 'Không tải được thông tin đặt lịch');
      } finally {
        if (!cancelled) setIsLoadingBooking(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // Deep-link return from VNPay (autowashpro://payment/checkout?...&vnpay_result=...)
  useEffect(() => {
    if (!vnpayResultParam) return;
    let cancelled = false;
    const handleReturn = async () => {
      try {
        // Expo Router may already decode once; try raw first, then double-decode fallback
        let parsed: any;
        try {
          parsed = JSON.parse(vnpayResultParam);
        } catch {
          parsed = JSON.parse(decodeURIComponent(vnpayResultParam));
        }

        if (parsed?.success) {
          if (isProvisional) {
            // Provisional: create booking + link payment after VNPay success
            const payType = paymentMode === 'full' ? 'full' : 'deposit';
            const newBookingId = await createBookingFromDraft();
            if (!cancelled && newBookingId) {
              setCreatedBookingId(newBookingId);
              await linkPaymentToBooking(newBookingId, payType);
              if (isRecurringType) {
                await AsyncStorage.removeItem('aw_recurring_draft');
              }
              bookingCtx?.resetAll?.();
              setStep('success');
            }
          } else {
            const paid = await checkPaid();
            if (!cancelled && !paid) setStep('success');
          }
        } else if (!cancelled) {
          setError(parsed?.message || 'Thanh toán VNPay thất bại hoặc bị huỷ');
          setStep('amount');
        }
      } catch {
        if (!isProvisional) await checkPaid();
      }
    };
    handleReturn();
    return () => {
      cancelled = true;
    };
    // checkPaid is stable via useCallback on bookingId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vnpayResultParam, bookingId]);

  // Compute amounts from booking (existing) or draft (provisional)
  const totalAmount = useMemo(() => {
    if (isProvisional) {
      if (isRecurringType && recurringDraft) {
        return recurringDraft.totalAmount ?? 0;
      }
      // Single booking provisional: compute from BookingContext draft
      const pkg = bookingCtx?.selectedPackage;
      const basePrice = pkg?.price ?? 0;
      const extras = checkoutExtras || {};
      const subTotal = (extras.selectedSubServices || []).reduce((sum: number, sub: any) => {
        const subService = (pkg as any)?.subServices?.find((s: any) => s.name === sub);
        return sum + (subService?.price ?? 0);
      }, 0);
      const voucherDiscount = bookingCtx?.voucher?.discountAmount ?? 0;
      return Math.max(0, basePrice + subTotal - voucherDiscount);
    }
    // Existing booking mode
    if (!booking) return 0;
    const beDeposit = booking.depositAmount ?? 0;
    if (beDeposit > 0) {
      return Math.round(beDeposit / 0.3 / 1000) * 1000;
    }
    return booking.finalPrice ?? booking.totalPrice ?? 0;
  }, [booking, isProvisional, isRecurringType, recurringDraft, bookingCtx?.selectedPackage, bookingCtx?.voucher, checkoutExtras]);

  const depositAmount = useMemo(() => {
    if (isProvisional) {
      if (isRecurringType && recurringDraft) {
        return recurringDraft.depositAmount ?? Math.round((totalAmount * 0.3) / 1000) * 1000;
      }
      return Math.round((totalAmount * 0.3) / 1000) * 1000;
    }
    if (!booking) return 0;
    return booking.depositAmount ?? Math.round((totalAmount * 0.3) / 1000) * 1000;
  }, [booking, totalAmount, isProvisional, isRecurringType, recurringDraft]);

  const amount = useMemo(() => {
    if (paymentMode === 'full') return totalAmount;
    return depositAmount;
  }, [paymentMode, totalAmount, depositAmount]);

  const remainingAmount = useMemo(() => {
    if (paymentMode === 'full') return 0;
    return Math.max(0, totalAmount - depositAmount);
  }, [paymentMode, totalAmount, depositAmount]);

  const checkPaid = useCallback(async (): Promise<boolean> => {
    if (!bookingId) return false;
    try {
      const p = await paymentApi.getPaymentByBooking(bookingId);
      if (p?.status === 'paid' || (p as any)?.status === 'completed') {
        setPayment(p);
        setStep('success');
        return true;
      }
    } catch {
      /* ignore poll errors */
    }
    return false;
  }, [bookingId]);

  // Create booking from draft (provisional mode only)
  const createBookingFromDraft = useCallback(async (): Promise<string> => {
    if (isRecurringType && recurringDraft) {
      const { apiClient } = require('../../src/api/client');
      const result = await apiClient.post('/bookings/recurring', recurringDraft);
      const data = result.data;
      const firstBooking = data.created?.[0];
      return firstBooking?._id || '';
    }
    // Single booking from BookingContext draft
    const ctx = bookingCtx;
    if (!ctx?.selectedBranch || !ctx?.selectedPackage || !ctx?.selectedVehicle || !ctx?.selectedDate || !ctx?.selectedTime) {
      throw new Error('Thiếu thông tin đặt lịch');
    }
    // Read extras not stored in BookingContext (sub-services, voucher code)
    let extras: any = {};
    try {
      const raw = await AsyncStorage.getItem('aw_checkout_extras');
      if (raw) extras = JSON.parse(raw);
    } catch { /* ignore */ }
    const response = await bookingApi.createBooking({
      branchId: ctx.selectedBranch._id,
      packageId: ctx.selectedPackage._id,
      vehicleId: ctx.selectedVehicle._id,
      bookingDate: ctx.selectedDate,
      startTime: ctx.selectedTime,
      voucherCode: extras.voucherCode || ctx.voucher?.code || undefined,
      selectedSubServices: extras.selectedSubServices || [],
      note: '',
    });
    // Clean up extras
    await AsyncStorage.removeItem('aw_checkout_extras');
    return response._id;
  }, [isRecurringType, recurringDraft, bookingCtx]);

  // Link payment to booking after provisional payment succeeds
  const linkPaymentToBooking = useCallback(async (newBookingId: string, paymentType: string) => {
    const p = await paymentApi.createPayment({
      bookingId: newBookingId,
      paymentMethod: paymentMethod,
      type: paymentType as any,
    });
    await paymentApi.simulatePayment({
      transactionId: p.transactionId || `LINKED${Date.now()}`,
      gatewayTransactionId: `SIM${Date.now()}`,
      success: true,
    });
    return p;
  }, [paymentMethod]);

  const handleCreatePayment = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const payType = paymentMode === 'full' ? 'full' : 'deposit';
      if (paymentMethod === 'bank') {
        if (isProvisional) {
          const p = await paymentApi.createBankProvisional(amount, payType);
          setPayment(p);
        } else {
          const p = await paymentApi.createPayment({
            bookingId,
            paymentMethod: 'bank',
            type: payType,
          });
          setPayment(p);
        }
        setStep('qr');
        setPollCount(0);
      } else {
        const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:5000/api').replace(/\/$/, '');
        const returnUrl = isProvisional
          ? `${apiBase}/payments/vnpay-return?client=mobile`
          : `${apiBase}/payments/vnpay-return?client=mobile&bookingId=${encodeURIComponent(bookingId)}`;
        if (isProvisional) {
          const result = await paymentApi.createVnpayProvisional(amount);
          setPayment(result.payment ?? result);
          setVnpayUrl(result.paymentUrl);
          await Linking.openURL(result.paymentUrl);
        } else {
          const result = await paymentApi.createVnpayPayment({
            bookingId,
            paymentType: payType,
            amount,
            returnUrl,
          });
          setPayment(result.payment ?? result);
          setVnpayUrl(result.paymentUrl);
          await Linking.openURL(result.paymentUrl);
        }
        setStep('vnpay_pending');
        setPollCount(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll while waiting for bank QR / VNPay confirmation
  useEffect(() => {
    if (step !== 'qr' && step !== 'vnpay_pending') return;
    // In provisional mode, skip booking-based polling (handled by confirm action)
    if (isProvisional) return;
    const interval = setInterval(async () => {
      const paid = await checkPaid();
      if (!paid) setPollCount((c) => c + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [step, bookingId, checkPaid, isProvisional]);

  // When user returns from browser (VNPay), re-check immediately
  useFocusEffect(
    useCallback(() => {
      if (step === 'vnpay_pending' || step === 'qr') {
        checkPaid();
      }
    }, [step, checkPaid]),
  );

  useEffect(() => {
    if (step !== 'vnpay_pending') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPaid();
    });
    return () => sub.remove();
  }, [step, checkPaid]);

  const handleConfirmTransfer = async () => {
    if (!payment) return;
    setIsProcessing(true);
    try {
      // Simulate provisional payment
      await paymentApi.simulatePayment({
        transactionId: payment.transactionId,
        gatewayTransactionId: `SIM${Date.now()}`,
        success: true,
      });
      // In provisional mode: create booking + link payment after provisional payment succeeds
      if (isProvisional) {
        const payType = paymentMode === 'full' ? 'full' : 'deposit';
        const newBookingId = await createBookingFromDraft();
        if (newBookingId) {
          setCreatedBookingId(newBookingId);
          await linkPaymentToBooking(newBookingId, payType);
          // Clear AsyncStorage draft if recurring
          if (isRecurringType) {
            await AsyncStorage.removeItem('aw_recurring_draft');
          }
        }
        bookingCtx?.resetAll?.();
      }
      setStep('success');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể xác nhận thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenVnpay = async () => {
    if (vnpayUrl) {
      await Linking.openURL(vnpayUrl);
      return;
    }
    // Recreate if URL was lost
    await handleCreatePayment();
  };

  const handleDone = () => {
    const viewingBookingId = createdBookingId || bookingId;
    if (viewingBookingId) {
      router.replace(`/booking/${viewingBookingId}` as any);
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleCancel = () => {
    setPayment(null);
    setVnpayUrl(null);
    setStep('amount');
    setError('');
    setPollCount(0);
  };

  const branchName = nameOf(booking?.branchId as Branch | string | undefined);
  const packageName = nameOf(booking?.packageId as Package | string | undefined);
  const vehiclePlate = plateOf(booking?.vehicleId as Vehicle | string | undefined);

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

  if (!booking && !isProvisional) {
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

  // ------- SUCCESS -------
  if (step === 'success') {
    const viewingBookingId = createdBookingId || bookingId;
    return (
      <ScreenContainer>
        <View style={[styles.successTopBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View />
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)' as any)}
            style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            accessibilityLabel="Đóng"
          >
            <AppText style={[styles.closeBtnText, { color: colors.textPrimary }]}>✕</AppText>
          </TouchableOpacity>
        </View>
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
          {viewingBookingId ? (
            <Button
              title="Xem đặt lịch"
              onPress={() => router.replace(`/booking/${viewingBookingId}` as any)}
              fullWidth
              size="large"
            />
          ) : (
            <Button title="Về trang chủ" onPress={() => router.replace('/(tabs)' as any)} fullWidth size="large" />
          )}
          <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={styles.cancelBtn}>
            <AppText variant="body" color="textSecondary">
              Về trang chủ
            </AppText>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ------- QR (bank) -------
  if (step === 'qr' && payment?.qrCode) {
    return (
      <ScreenContainer>
        <Header title="Chuyển khoản" showBack onBackPress={handleCancel} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.qrHeader}>
            <View style={[styles.qrIconWrap, { backgroundColor: colors.successLight }]}>
              <AppText style={styles.qrIcon}>💳</AppText>
            </View>
            <AppText variant="h3" style={styles.qrTitle}>
              Chuyển khoản ngân hàng
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.qrSubtitle}>
              Quét mã QR bằng app ngân hàng bất kỳ
            </AppText>
          </View>

          <View style={styles.qrImageWrap}>
            <View style={[styles.qrImageBorder, { borderColor: colors.border }]}>
              <Image source={{ uri: payment.qrCode }} style={styles.qrImage} resizeMode="contain" />
            </View>
          </View>

          {/* Bank transfer details */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surface }}>
            <View style={styles.summaryRow}>
              <AppText variant="body" color="textSecondary">
                Số tiền cần chuyển
              </AppText>
              <AppText variant="h2" color="primary">
                {formatCurrency(amount)}
              </AppText>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.bankDetailRow}>
              <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Ngân hàng</AppText>
              <AppText variant="body" style={{ flex: 1, fontWeight: '500' }}>
                {payment.bankInfo?.bankName || 'Ngân hàng TMCP Quân đội (MB)'}
              </AppText>
            </View>
            <View style={styles.bankDetailRow}>
              <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Số tài khoản</AppText>
              <AppText variant="body" style={{ flex: 1, fontWeight: '500' }}>
                {payment.bankInfo?.accountNumber || '9796688888'}
              </AppText>
            </View>
            <View style={styles.bankDetailRow}>
              <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Chủ tài khoản</AppText>
              <AppText variant="body" style={{ flex: 1, fontWeight: '500' }}>
                {payment.bankInfo?.accountHolder || 'CONG TY CO PHAN AUTO WASH PRO'}
              </AppText>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.bankDetailRow}>
              <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Nội dung CK</AppText>
              <AppText variant="body" style={{ flex: 1, fontWeight: '600', color: colors.primary }}>
                {payment.bankInfo?.transferContent || `${paymentMode === 'full' ? 'THANH TOAN' : 'DAT COC'} ${payment.transactionId || ''}`}
              </AppText>
            </View>
            {payment.transactionId ? (
              <View style={styles.bankDetailRow}>
                <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Mã giao dịch</AppText>
                <AppText variant="body" style={{ flex: 1 }}>
                  {payment.transactionId}
                </AppText>
              </View>
            ) : null}

            {remainingAmount > 0 && (
              <>
                <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.summaryRow}>
                  <AppText variant="body" color="textSecondary">
                    Còn lại (thanh toán sau)
                  </AppText>
                  <AppText variant="body" color="textTertiary">
                    {formatCurrency(remainingAmount)}
                  </AppText>
                </View>
              </>
            )}
          </Card>

          <AppText variant="caption" color="textTertiary" style={styles.pollingText}>
            Đang kiểm tra thanh toán... ({pollCount})
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
            <AppText variant="body" color="textSecondary">
              Quay lại chọn phương thức
            </AppText>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ------- VNPAY PENDING -------
  if (step === 'vnpay_pending') {
    return (
      <ScreenContainer>
        <Header title="VNPay" showBack onBackPress={handleCancel} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.qrHeader}>
            <View style={[styles.qrIconWrap, { backgroundColor: colors.primaryLight ?? '#eff6ff' }]}>
              <AppText style={styles.qrIcon}>🌐</AppText>
            </View>
            <AppText variant="h3" style={styles.qrTitle}>
              Đang chờ thanh toán VNPay
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.qrSubtitle}>
              Hoàn tất thanh toán trên trình duyệt. Khi xong, quay lại app — hệ thống sẽ tự xác nhận.
            </AppText>
          </View>

          <Card style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surface }}>
            <View style={styles.summaryRow}>
              <AppText variant="body" color="textSecondary">
                Số tiền cần thanh toán
              </AppText>
              <AppText variant="h2" color="primary">
                {formatCurrency(amount)}
              </AppText>
            </View>
            {remainingAmount > 0 && (
              <>
                <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.summaryRow}>
                  <AppText variant="body" color="textSecondary">
                    Còn lại (thanh toán sau)
                  </AppText>
                  <AppText variant="body" color="textTertiary">
                    {formatCurrency(remainingAmount)}
                  </AppText>
                </View>
              </>
            )}
          </Card>

          <View style={[styles.center, { paddingVertical: spacing.lg }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>

          <AppText variant="caption" color="textTertiary" style={styles.pollingText}>
            Đang kiểm tra thanh toán... ({pollCount})
          </AppText>

          <Card style={[styles.hintCard, { backgroundColor: colors.warningLight }]}>
            <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              Nếu sau khi OTP xong trình duyệt báo lỗi (ngrok offline), hãy quay lại app.
              Thanh toán vẫn có thể được xác nhận khi BE nhận IPN/return. Bấm "Kiểm tra lại" bên dưới.
            </AppText>
          </Card>
        </ScrollView>

        <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button title="Kiểm tra lại" onPress={() => checkPaid()} fullWidth size="large" />
          <Button
            title="Mở lại VNPay"
            variant="outline"
            onPress={handleReopenVnpay}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <AppText variant="body" color="textSecondary">
              Quay lại chọn phương thức
            </AppText>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ------- AMOUNT (default) -------
  return (
    <ScreenContainer>
      <Header title="Thanh toán" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.warningLight }]}>
            <AppText style={styles.headerIcon}>💰</AppText>
          </View>
          <AppText variant="h2" style={styles.headerTitle}>
            {paymentMode === 'full' ? 'Thanh toán' : 'Thanh toán đặt cọc'}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.headerSubtitle}>
            {paymentMode === 'full'
              ? 'Vui lòng thanh toán để hoàn tất đặt lịch'
              : 'Vui lòng đặt cọc để hoàn tất đặt lịch'}
          </AppText>
        </View>

        {error ? (
          <Card style={[styles.errorCard, { backgroundColor: colors.errorLight }]}>
            <AppText variant="body" color="error">
              {error}
            </AppText>
          </Card>
        ) : null}

        {/* Booking detail — mirrors landing page summary */}
        <Card style={[styles.detailCard, { backgroundColor: colors.surface }]}>
          <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
            CHI TIẾT ĐẶT LỊCH
          </AppText>
          <DetailRow icon={Icons.locationOutline} label="Chi nhánh" value={branchName} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <DetailRow icon={Icons.sparkle} label="Gói dịch vụ" value={packageName} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <DetailRow icon={Icons.carOutline} label="Phương tiện" value={vehiclePlate} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <DetailRow
            icon={Icons.calendarOutline}
            label="Ngày"
            value={formatBookingDate(booking?.bookingDate)}
          />
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <DetailRow icon={Icons.timeOutline} label="Giờ" value={booking?.startTime || '—'} />
          {booking?.isRecurring || booking?.recurringGroupId ? (
            <>
              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
              <DetailRow
                icon={Icons.refreshOutline}
                label="Loại"
                value={
                  booking?.recurringTotal
                    ? `Định kỳ · ${booking.recurringTotal} buổi`
                    : 'Định kỳ'
                }
              />
            </>
          ) : null}
        </Card>

        {/* Price breakdown */}
        <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <AppText variant="body" color="textSecondary">
              Tổng dịch vụ
            </AppText>
            <AppText variant="body" style={styles.summaryValue}>
              {formatCurrency(totalAmount)}
            </AppText>
          </View>
          {paymentMode === 'deposit' ? (
            <>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ color: '#d97706', fontWeight: '600' }}>
                    Đặt cọc (30%)
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    30% × {formatCurrency(totalAmount)}
                  </AppText>
                </View>
                <AppText variant="h3" style={{ color: '#d97706' }}>
                  {formatCurrency(depositAmount)}
                </AppText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.summaryRow}>
                <AppText variant="body" color="textSecondary">
                  Còn lại (thanh toán sau)
                </AppText>
                <AppText variant="body" color="textTertiary">
                  {formatCurrency(remainingAmount)}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ color: '#10b981', fontWeight: '600' }}>
                    Thanh toán (100%)
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    Thanh toán toàn bộ hóa đơn
                  </AppText>
                </View>
                <AppText variant="h3" style={{ color: '#10b981' }}>
                  {formatCurrency(totalAmount)}
                </AppText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.summaryRow}>
                <AppText variant="body" color="textSecondary">
                  Còn lại (thanh toán sau)
                </AppText>
                <AppText variant="body" color="textTertiary">
                  0đ
                </AppText>
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

          <TouchableOpacity
            onPress={() => setPaymentMethod('bank')}
            activeOpacity={0.7}
            style={[
              styles.methodOption,
              { borderColor: colors.border, backgroundColor: colors.background },
              paymentMethod === 'bank' && { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
            ]}
          >
            <View style={[styles.methodIconWrap, { backgroundColor: '#10b981' }]}>
              <AppText style={styles.methodIconText}>🏦</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={styles.methodName}>
                Ngân hàng
              </AppText>
              <AppText variant="caption" color="textTertiary">
                Chuyển khoản qua mã QR
              </AppText>
            </View>
            {paymentMethod === 'bank' ? (
              <View style={[styles.radio, { borderColor: '#10b981' }]}>
                <View style={[styles.radioInner, { backgroundColor: '#10b981' }]} />
              </View>
            ) : (
              <View style={[styles.radio, { borderColor: colors.border }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentMethod('vnpay')}
            activeOpacity={0.7}
            style={[
              styles.methodOption,
              { borderColor: colors.border, backgroundColor: colors.background, marginBottom: 0 },
              paymentMethod === 'vnpay' && { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
            ]}
          >
            <View style={[styles.methodIconWrap, { backgroundColor: '#2563eb' }]}>
              <AppText style={styles.methodIconText}>🌐</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={styles.methodName}>
                VNPay
              </AppText>
              <AppText variant="caption" color="textTertiary">
                Cổng thanh toán VNPay
              </AppText>
            </View>
            {paymentMethod === 'vnpay' ? (
              <View style={[styles.radio, { borderColor: '#2563eb' }]}>
                <View style={[styles.radioInner, { backgroundColor: '#2563eb' }]} />
              </View>
            ) : (
              <View style={[styles.radio, { borderColor: colors.border }]} />
            )}
          </TouchableOpacity>
        </Card>

        {/* Spacer so last content isn't hidden under sticky bottom bar */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.bottomRow}>
          <View style={styles.bottomBack}>
            <Button title="Quay lại" variant="outline" onPress={() => router.back()} fullWidth />
          </View>
          <View style={styles.bottomPay}>
            <Button
              title={
                paymentMethod === 'vnpay'
                  ? `VNPay ${formatCurrency(amount)}`
                  : paymentMode === 'full'
                    ? `Thanh toán ${formatCurrency(amount)}`
                    : `Đặt cọc ${formatCurrency(amount)}`
              }
              onPress={handleCreatePayment}
              loading={isProcessing}
              disabled={amount <= 0}
              fullWidth
              size="large"
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
        <AppText variant="bodySmall" color="textSecondary">
          {label}
        </AppText>
      </View>
      <AppText variant="bodySmall" style={styles.detailValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // contentContainerStyle — NO flex:1 (that blocks scroll when content is tall)
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  headerIcon: {
    fontSize: 26,
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
  detailCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  detailValue: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
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
    fontWeight: '600',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
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
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    paddingTop: spacing.md,
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
    textAlign: 'center',
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
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  successTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  pollingText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  hintCard: {
    padding: spacing.md,
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomBack: {
    flex: 1,
  },
  bottomPay: {
    flex: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});

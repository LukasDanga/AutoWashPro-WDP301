/**
 * AutoWashPro Deposit / Payment Method Selector Screen
 *
 * Cọc & thanh toán cho 1 booking (single hoặc recurring buổi đầu).
 *
 * URL params:
 *   - bookingId:  id của booking cần thu tiền.
 *   - type:       'deposit' (mặc định) | 'remaining' | 'full'.
 *                 'deposit'   → 30% × finalPrice (gộp cả nhóm nếu recurring).
 *                 'remaining' → finalPrice − depositAmount (sau khi cọc).
 *                 'full'      → toàn bộ finalPrice (một lần).
 *
 * Vì cùng UI nên mọi type đều chạy qua flow chọn phương thức → confirm.
 * BE (`paymentService.createPayment`) tự nhánh theo `paymentType` để:
 *   - 'deposit'   chỉ chấp nhận khi booking.depositAmount > 0 và chưa cọc.
 *   - 'remaining' chỉ hiển thị khi đã cọc trước đó.
 *   - 'full'      mặc định, hoạt động cho mọi booking.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi, bookingApi } from '../../src/api';
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
import { formatCurrency, formatDate } from '../../src/utils';
import type { PaymentMethod, PaymentType, Booking } from '../../src/types';

type PayableType = 'deposit' | 'remaining' | 'full';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  // Một số method không thể chi trả từ xa (cash) — vẫn cho chọn để user linh hoạt.
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'momo',
    name: 'MoMo',
    icon: 'phone-portrait-outline',
    description: 'Quét QR bằng ứng dụng MoMo',
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    icon: 'card-outline',
    description: 'Quét QR bằng ứng dụng ngân hàng hỗ trợ VNPay',
  },
  {
    id: 'cash',
    name: 'Tiền mặt tại chi nhánh',
    icon: 'cash-outline',
    description: 'Đến chi nhánh và thanh toán trực tiếp',
  },
];

const TYPE_LABEL: Record<PayableType, string> = {
  deposit: 'Đặt cọc',
  remaining: 'Thanh toán phần còn lại',
  full: 'Thanh toán toàn bộ',
};

const TYPE_DESCRIPTION: Record<PayableType, string> = {
  deposit:
    'Giữ chỗ chắc chắn cho lịch đặt. Có thể hoàn / bù trừ khi đến. Phần còn lại thanh toán khi hoàn thành dịch vụ.',
  remaining:
    'Đã cọc trước đó. Thanh toán phần còn lại sau khi dịch vụ hoàn thành.',
  full: 'Thanh toán 1 lần cho toàn bộ đơn. Áp dụng cho mọi booking.',
};

export default function PaymentSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const toast = useToast();

  const bookingId = (params.bookingId as string) || '';
  const rawType = (params.type as PayableType) || 'deposit';
  // Fallback nếu URL truyền type lạ.
  const payableType: PayableType = ['deposit', 'remaining', 'full'].includes(rawType)
    ? rawType
    : 'deposit';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidPayment, setPaidPayment] = useState<any | null>(null);

  // Tính số tiền cần trả cho payableType — match logic BE.
  const computedAmount = useMemo(() => {
    if (!booking) return 0;
    const full = booking.finalPrice ?? booking.totalPrice ?? 0;
    const deposit = booking.depositAmount ?? 0;
    if (payableType === 'deposit') return deposit;
    if (payableType === 'remaining') {
      // Phần còn lại = full − deposit (nếu đã cọc) hoặc full (nếu chưa).
      if (booking.depositPaid) return Math.max(0, full - deposit);
      return full;
    }
    return full;
  }, [booking, payableType]);

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
          toast.error('Lỗi', err.response?.data?.message || 'Không tải được thông tin đặt lịch');
        }
      } finally {
        if (!cancelled) setIsLoadingBooking(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handlePayment = async () => {
    if (!bookingId || !booking) {
      AlertDialog.error('Lỗi', 'Không tìm thấy thông tin đặt lịch');
      return;
    }

    // Guard theo nghiệp vụ:
    // - Cọc: bắt buộc booking có depositAmount > 0 và chưa cọc.
    // - Phần còn lại: yêu cầu đã cọc trước đó.
    if (payableType === 'deposit') {
      if ((booking.depositAmount ?? 0) <= 0) {
        AlertDialog.error('Không cần cọc', 'Đơn này không yêu cầu đặt cọc.');
        return;
      }
      if (booking.depositPaid) {
        AlertDialog.error('Đã cọc', 'Bạn đã đặt cọc cho đơn này rồi.');
        return;
      }
    }
    if (payableType === 'remaining' && !booking.depositPaid) {
      AlertDialog.error(
        'Chưa cọc',
        'Cần đặt cọc trước khi thanh toán phần còn lại.',
      );
      return;
    }

    setIsProcessing(true);
    try {
      const payment = await paymentApi.createPayment({
        bookingId,
        paymentMethod: selectedMethod,
        type: payableType as PaymentType,
      });

      if (selectedMethod === 'cash') {
        // Cash auto-confirm ở BE, payment.status === 'paid' luôn.
        setPaidPayment(payment);
        toast.success(
          'Đặt cọc thành công',
          'Vui lòng thanh toán tiền mặt khi đến chi nhánh',
        );
      } else {
        // MoMo / VNPay — hiển thị QR để user quét ngay trong app.
        // Nếu gateway trả paymentUrl, mở bằng Linking; nếu không, dùng qrCode.
        setPaidPayment(payment);
        if (payment.paymentUrl) {
          Linking.openURL(payment.paymentUrl).catch(() => {
            // Fallback: vẫn hiển thị QR trong app.
          });
        }
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

  // Sau khi thanh toán xong (cash auto-confirm hoặc QR hiển thị), cho user
  // bấm "Xem chi tiết" để đi tới booking/[id] và thấy paymentStatus cập nhật.
  const handleViewDetail = () => {
    router.replace(`/booking/${bookingId}` as any);
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header title="Thanh toán" showBack />
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

  // Trang "kết quả thanh toán" cho MoMo/VNPay (sau khi tạo payment pending).
  if (paidPayment && selectedMethod !== 'cash') {
    return (
      <ScreenContainer>
        <Header title="Quét QR để thanh toán" showBack />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={[styles.qrCard, { backgroundColor: colors.surface }]}>
            <AppText variant="h4" style={styles.cardTitle}>
              {TYPE_LABEL[payableType]} — {selectedMethod === 'momo' ? 'MoMo' : 'VNPay'}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.qrCaption}>
              Mở app {selectedMethod === 'momo' ? 'MoMo' : 'ngân hàng'} và quét mã bên dưới
            </AppText>

            {paidPayment.qrCode ? (
              <View style={styles.qrBox}>
                <Image
                  source={{ uri: paidPayment.qrCode }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            ) : paidPayment.paymentUrl ? (
              <View style={styles.urlBox}>
                <AppText variant="caption" color="textSecondary" style={styles.urlText}>
                  {paidPayment.paymentUrl}
                </AppText>
                <Button
                  title="Mở cổng thanh toán"
                  onPress={() => Linking.openURL(paidPayment.paymentUrl)}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : (
              <AppText variant="body" color="textSecondary">
                Đang chờ cổng thanh toán xử lý…
              </AppText>
            )}

            <View style={styles.amountRow}>
              <AppText variant="body" color="textSecondary">Số tiền</AppText>
              <AppText variant="h3" color="primary">
                {formatCurrency(paidPayment.amount ?? computedAmount)}
              </AppText>
            </View>
            {paidPayment.transactionId ? (
              <AppText variant="caption" color="textTertiary" style={styles.txnId}>
                Mã giao dịch: {paidPayment.transactionId}
              </AppText>
            ) : null}
          </Card>

          <Card style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
            <Icon name="information-circle-outline" size={20} color={colors.info} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Sau khi quét QR và xác nhận trên app, hệ thống sẽ tự cập nhật trạng
              thái thanh toán trong vài giây. Bạn có thể quay lại trang chi tiết
              đơn để xem trạng thái mới nhất.
            </AppText>
          </Card>
        </ScrollView>

        <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button
            title="Tôi đã thanh toán — xem chi tiết"
            onPress={handleViewDetail}
            fullWidth
            size="large"
          />
        </View>
      </ScreenContainer>
    );
  }

  // Trang "kết quả" cho cash — booking vẫn ở trạng thái pending cho đến khi
  // manager xác nhận. Hiển thị nút để user chuyển sang chi tiết.
  if (paidPayment && selectedMethod === 'cash') {
    return (
      <ScreenContainer>
        <Header title="Đặt cọc thành công" showBack />
        <View style={styles.content}>
          <Card style={[styles.successCard, { backgroundColor: colors.successLight }]}>
            <Icon name="checkmark-circle" size={56} color={colors.success} />
            <AppText variant="h3" style={styles.successTitle}>
              {TYPE_LABEL[payableType]} thành công
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.successText}>
              Số tiền {formatCurrency(paidPayment.amount ?? computedAmount)} sẽ được
              thu khi bạn đến chi nhánh. Đơn của bạn đang chờ nhân viên xác nhận.
            </AppText>
          </Card>
        </View>
        <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button title="Xem chi tiết đơn" onPress={handleViewDetail} fullWidth size="large" />
        </View>
      </ScreenContainer>
    );
  }

  const isDepositAlreadyPaid =
    payableType === 'deposit' && booking.depositPaid;
  const isRemainingNotEligible =
    payableType === 'remaining' && !booking.depositPaid;
  const isZeroDeposit = (booking.depositAmount ?? 0) <= 0;
  const isFullyPaid = booking.paymentStatus === 'paid';

  return (
    <ScreenContainer>
      <Header title="Thanh toán" showBack />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" color="textSecondary">
                Mã đặt lịch
              </AppText>
              <AppText variant="body">
                #{booking._id.slice(-8).toUpperCase()}
              </AppText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <AppText variant="caption" color="textSecondary">Gói dịch vụ</AppText>
            <AppText variant="bodySmall" style={styles.summaryValue}>
              {(booking.packageId as any)?.name || '—'}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="caption" color="textSecondary">Ngày giờ</AppText>
            <AppText variant="bodySmall" style={styles.summaryValue}>
              {formatDate(booking.bookingDate)} • {booking.startTime}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="caption" color="textSecondary">Tổng đơn</AppText>
            <AppText variant="bodySmall" style={styles.summaryValue}>
              {formatCurrency(booking.finalPrice ?? booking.totalPrice ?? 0)}
            </AppText>
          </View>
          {booking.depositAmount ? (
            <View style={styles.summaryRow}>
              <AppText variant="caption" color="textSecondary">Cọc (30%)</AppText>
              <AppText variant="bodySmall" style={styles.summaryValue}>
                {formatCurrency(booking.depositAmount)}
                {booking.depositPaid ? ' • đã cọc' : ' • chưa cọc'}
              </AppText>
            </View>
          ) : null}
        </Card>

        {/* Trạng thái chặn thanh toán */}
        {isFullyPaid ? (
          <Card style={[styles.warnCard, { backgroundColor: colors.successLight }]}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Đơn này đã được thanh toán đủ. Không cần đặt cọc thêm.
            </AppText>
          </Card>
        ) : null}
        {isDepositAlreadyPaid ? (
          <Card style={[styles.warnCard, { backgroundColor: colors.infoLight }]}>
            <Icon name="information-circle-outline" size={20} color={colors.info} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Bạn đã đặt cọc cho đơn này. Có thể thanh toán phần còn lại sau khi
              dịch vụ hoàn thành.
            </AppText>
          </Card>
        ) : null}
        {isZeroDeposit && payableType === 'deposit' ? (
          <Card style={[styles.warnCard, { backgroundColor: colors.warningLight }]}>
            <Icon name="alert-circle-outline" size={20} color={colors.warning} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Đơn này không yêu cầu đặt cọc (gói slot / thanh toán trọn gói).
            </AppText>
          </Card>
        ) : null}
        {isRemainingNotEligible ? (
          <Card style={[styles.warnCard, { backgroundColor: colors.warningLight }]}>
            <Icon name="alert-circle-outline" size={20} color={colors.warning} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Cần đặt cọc trước khi thanh toán phần còn lại.
            </AppText>
          </Card>
        ) : null}

        {/* Số tiền cần trả */}
        <Card style={styles.amountCard}>
          <AppText variant="label" color="textSecondary">
            {TYPE_LABEL[payableType]}
          </AppText>
          <AppText variant="h1" color="primary" style={styles.amountText}>
            {formatCurrency(computedAmount)}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {TYPE_DESCRIPTION[payableType]}
          </AppText>
        </Card>

        {/* Phương thức */}
        <AppText variant="h4" style={styles.sectionTitle}>
          Chọn phương thức thanh toán
        </AppText>

        {PAYMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setSelectedMethod(option.id)}
            activeOpacity={0.7}
            disabled={
              isFullyPaid ||
              isZeroDeposit ||
              isRemainingNotEligible ||
              isDepositAlreadyPaid
            }
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
                    { borderColor: selectedMethod === option.id ? colors.primary : colors.border },
                  ]}
                >
                  {selectedMethod === option.id ? (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  ) : null}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

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
            isFullyPaid
              ? 'Đơn đã thanh toán đủ'
              : isDepositAlreadyPaid
              ? 'Đã đặt cọc'
              : isZeroDeposit
              ? 'Không yêu cầu cọc'
              : isRemainingNotEligible
              ? 'Cần đặt cọc trước'
              : selectedMethod === 'cash'
              ? `Xác nhận ${TYPE_LABEL[payableType].toLowerCase()} tại chi nhánh`
              : `Thanh toán ${formatCurrency(computedAmount)} qua ${
                  PAYMENT_OPTIONS.find((o) => o.id === selectedMethod)?.name
                }`
          }
          onPress={handlePayment}
          loading={isProcessing}
          disabled={
            !bookingId ||
            isProcessing ||
            isFullyPaid ||
            isDepositAlreadyPaid ||
            isZeroDeposit ||
            isRemainingNotEligible
          }
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryHeader: {
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
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryValue: {
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  amountCard: {
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  amountText: {
    marginVertical: spacing.xs,
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
  warnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
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
  // QR / success
  qrCard: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  cardTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  qrCaption: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  qrBox: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  qrImage: {
    width: 260,
    height: 260,
  },
  urlBox: {
    marginBottom: spacing.md,
  },
  urlText: {
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  txnId: {
    marginTop: spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  successTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  successText: {
    textAlign: 'center',
  },
});

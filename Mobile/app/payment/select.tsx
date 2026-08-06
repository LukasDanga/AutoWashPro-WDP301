/**
 * AutoWashPro Deposit / Payment Method Selector Screen
 *
 * Cọc & thanh toán cho 1 booking (single hoặc recurring buổi đầu).
 *
 * URL params:
 *   - bookingId:  id của booking cần thu tiền.
 *   - type:       'deposit' (mặc định) | 'remaining' | 'full'.
 *                 'deposit'   → DEPOSIT_RATE × finalPrice (gộp cả nhóm nếu recurring).
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSystemConfig } from '../../src/contexts/ConfigContext';
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
import { spacing, borderRadius, layout, shadows } from '../../src/theme/spacing';
import { formatCurrency, formatDate } from '../../src/utils';
import type { PaymentMethod, PaymentType, Booking } from '../../src/types';

type PayableType = 'deposit' | 'remaining' | 'full';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  badge?: string;
  color: string;
  bg: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'wallet',
    name: 'Ví AutoWash',
    icon: 'wallet-outline',
    description: 'Thanh toán tức thì bằng số dư ví AutoWash',
    badge: 'Khuyên dùng',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
  {
    id: 'vnpay',
    name: 'VNPay QR',
    icon: 'card-outline',
    description: 'Thẻ ATM / QR Banking hỗ trợ VNPay',
    badge: 'Nhanh chóng',
    color: '#005BAA',
    bg: 'rgba(0, 91, 170, 0.12)',
  },
  {
    id: 'bank',
    name: 'Chuyển khoản Ngân hàng',
    icon: 'business-outline',
    description: 'Tạo VietQR chuyển khoản tự động 24/7',
    color: '#4F46E5',
    bg: 'rgba(79, 70, 229, 0.12)',
  },
  {
    id: 'cash',
    name: 'Tiền mặt tại chi nhánh',
    icon: 'cash-outline',
    description: 'Thanh toán trực tiếp khi đến chi nhánh',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
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
  const configs = useSystemConfig();
  const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE) : 0;
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, user, fetchUser } = useAuth();
  const colors = useColors();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const bottomActionStyle = [
    styles.bottomAction,
    {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      paddingBottom: Math.max(insets.bottom, 14),
    },
  ];

  const bookingId = (params.bookingId as string) || '';
  const rawType = (params.type as PayableType) || 'deposit';
  const payableType: PayableType = ['deposit', 'remaining', 'full'].includes(rawType)
    ? rawType
    : 'deposit';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidPayment, setPaidPayment] = useState<any | null>(null);

  const walletBalance = user?.walletBalance ?? 0;

  const fullAmount = useMemo(() => {
    if (!booking) return 0;
    const beDeposit = booking.depositAmount ?? 0;
    const rawRate = configs?.DEPOSIT_RATE;
    const depositRate = typeof rawRate === 'number'
      ? (rawRate > 1 ? rawRate / 100 : rawRate)
      : 0.3;
    if (beDeposit > 0) {
      return Math.round((beDeposit / depositRate) / 1000) * 1000;
    }
    return booking.finalPrice ?? booking.totalPrice ?? 0;
  }, [booking, configs]);

  const computedAmount = useMemo(() => {
    if (!booking) return 0;
    const deposit = booking.depositAmount ?? 0;
    if (payableType === 'deposit') return deposit;
    if (payableType === 'remaining') {
      if (booking.depositPaid && deposit > 0) {
        return Math.max(0, fullAmount - deposit);
      }
      return 0;
    }
    return fullAmount;
  }, [booking, payableType, fullAmount]);

  useEffect(() => {
    let cancelled = false;
    if (fetchUser) fetchUser().catch(() => {});
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
  }, [bookingId]);

  const handlePayment = async () => {
    if (!bookingId || !booking) {
      AlertDialog.error('Lỗi', 'Không tìm thấy thông tin đặt lịch');
      return;
    }

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
    if (payableType === 'remaining') {
      if (!booking.depositPaid) {
        AlertDialog.error(
          'Chưa cọc',
          'Cần đặt cọc trước khi thanh toán phần còn lại.',
        );
        return;
      }
      if ((booking.depositAmount ?? 0) <= 0) {
        AlertDialog.error(
          'Không có dư nợ',
          'Đơn này không có phần còn lại để thanh toán.',
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      const payment = await paymentApi.createPayment({
        bookingId,
        paymentMethod: selectedMethod,
        type: payableType as PaymentType,
      });

      if (selectedMethod === 'cash' || selectedMethod === 'wallet') {
        setPaidPayment(payment);
        if (selectedMethod === 'wallet') {
          toast.success('Thanh toán thành công', 'Đã thanh toán bằng Ví AutoWash');
        } else {
          toast.info('Đã ghi nhận lựa chọn', 'Vui lòng thanh toán tiền mặt trực tiếp khi đến chi nhánh');
        }
      } else {
        setPaidPayment(payment);
        if (payment.paymentUrl) {
          Linking.openURL(payment.paymentUrl).catch(() => {});
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

  if (paidPayment && selectedMethod !== 'cash' && selectedMethod !== 'wallet') {
    return (
      <ScreenContainer>
        <Header title="Quét QR để thanh toán" showBack />
        <ScrollView contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="h4" style={styles.cardTitle}>
              {TYPE_LABEL[payableType]} — {selectedMethod === 'vnpay' ? 'VNPay' : 'Ngân hàng'}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.qrCaption}>
              Mở app {selectedMethod === 'vnpay' ? 'VNPay / ngân hàng' : 'ngân hàng'} và quét mã bên dưới
            </AppText>

            {paidPayment.qrCode ? (
              <View style={[styles.qrWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                  size="large"
                />
              </View>
            ) : (
              <AppText variant="body" color="textSecondary">
                Đang chờ cổng thanh toán xử lý…
              </AppText>
            )}

            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            <View style={styles.amountRow}>
              <AppText variant="body" color="textSecondary">Số tiền</AppText>
              <AppText variant="h3" color="primary" style={{ fontWeight: '700' }}>
                {formatCurrency(paidPayment.amount ?? computedAmount)}
              </AppText>
            </View>
            {paidPayment.transactionId ? (
              <AppText variant="caption" color="textTertiary" style={styles.txnId}>
                Mã giao dịch: {paidPayment.transactionId}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.infoCardBox, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
            <Icon name="information-circle-outline" size={20} color={colors.info} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Sau khi quét QR và xác nhận trên app, hệ thống sẽ tự cập nhật trạng
              thái thanh toán trong vài giây.
            </AppText>
          </View>
        </ScrollView>

        <View style={bottomActionStyle}>
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

  if (paidPayment && selectedMethod === 'wallet') {
    return (
      <ScreenContainer>
        <Header title="Thanh toán bằng Ví thành công" showBack />
        <View style={styles.content}>
          <View style={[styles.cardContainer, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Icon name="checkmark-circle" size={56} color={colors.success} />
              <AppText variant="h3" style={styles.successTitle}>
                Thanh toán thành công
              </AppText>
              <AppText variant="body" color="textSecondary" style={[styles.successText, { textAlign: 'center', lineHeight: 20 }]}>
                Số tiền {formatCurrency(paidPayment.amount ?? computedAmount)} đã được trừ trực tiếp từ Ví AutoWash của bạn.
              </AppText>
            </View>
          </View>
        </View>
        <View style={bottomActionStyle}>
          <Button title="Xem chi tiết đơn" onPress={handleViewDetail} fullWidth size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (paidPayment && selectedMethod === 'cash') {
    return (
      <ScreenContainer>
        <Header title="Ghi nhận phương thức tiền mặt" showBack />
        <View style={styles.content}>
          <View style={[styles.cardContainer, { backgroundColor: colors.warningLight || '#FEF3C7', borderColor: colors.warning || '#F59E0B' }]}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Icon name="time-outline" size={56} color={colors.warning || '#F59E0B'} />
              <AppText variant="h3" style={[styles.successTitle, { color: colors.textPrimary }]}>
                Đã ghi nhận phương thức Tiền mặt
              </AppText>
              <AppText variant="body" color="textSecondary" style={[styles.successText, { textAlign: 'center', lineHeight: 22, marginTop: 8 }]}>
                Bạn đã chọn thanh toán {formatCurrency(paidPayment.amount ?? computedAmount)} bằng tiền mặt. Vui lòng thanh toán trực tiếp cho nhân viên khi đến chi nhánh. Quản lý / nhân viên chi nhánh sẽ kiểm tra và xác nhận thanh toán cho bạn.
              </AppText>
            </View>
          </View>
        </View>
        <View style={bottomActionStyle}>
          <Button title="Tôi đã hiểu — Xem chi tiết đơn" onPress={handleViewDetail} fullWidth size="large" />
        </View>
      </ScreenContainer>
    );
  }

  const isDepositAlreadyPaid = payableType === 'deposit' && booking.depositPaid;
  const isRemainingNotEligible =
    payableType === 'remaining' &&
    (!booking.depositPaid || (booking.depositAmount ?? 0) <= 0);
  const isZeroDeposit = (booking.depositAmount ?? 0) <= 0;
  const isFullyPaid = booking.paymentStatus === 'paid';

  const isDisabled =
    isFullyPaid ||
    isDepositAlreadyPaid ||
    (isZeroDeposit && payableType === 'deposit') ||
    isRemainingNotEligible;

  const getButtonTitle = () => {
    if (isFullyPaid) return 'Đơn đã thanh toán đủ';
    if (isDepositAlreadyPaid) return 'Đã đặt cọc đơn này';
    if (isZeroDeposit && payableType === 'deposit') return 'Không yêu cầu cọc';
    if (isRemainingNotEligible) return 'Cần đặt cọc trước';
    if (selectedMethod === 'cash') return `Xác nhận trả tiền mặt (${formatCurrency(computedAmount)})`;
    return `Thanh toán ${formatCurrency(computedAmount)}`;
  };

  return (
    <ScreenContainer background="subtle">
      <Header title="Thanh toán" showBack />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking summary card */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textSecondary">
                Mã đặt lịch
              </AppText>
              <AppText variant="h4" color="textPrimary" style={{ fontWeight: '700' }}>
                #{booking._id.slice(-8).toUpperCase()}
              </AppText>
            </View>
          </View>

          <View style={[styles.dividerLine, { backgroundColor: colors.borderLight || '#F1F5F9' }]} />

          <View style={styles.summaryRow}>
            <AppText variant="caption" color="textSecondary">Gói dịch vụ</AppText>
            <AppText variant="bodySmall" style={styles.summaryValue}>
              {(booking.packageId as any)?.name || 'Gói dịch vụ rửa xe'}
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
              {formatCurrency(fullAmount)}
            </AppText>
          </View>
          {booking.depositAmount ? (
            <View style={styles.summaryRow}>
              <AppText variant="caption" color="textSecondary">Cọc ({depositPercent}%)</AppText>
              <AppText variant="bodySmall" style={[styles.summaryValue, { color: booking.depositPaid ? colors.success : colors.warning }]}>
                {formatCurrency(booking.depositAmount)}
                {booking.depositPaid ? ' • đã cọc' : ' • chưa cọc'}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Blocking alerts */}
        {isFullyPaid && (
          <View style={[styles.infoCardBox, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Đơn này đã được thanh toán đủ. Không cần đặt cọc thêm.
            </AppText>
          </View>
        )}
        {isDepositAlreadyPaid && (
          <View style={[styles.infoCardBox, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
            <Icon name="information-circle-outline" size={20} color={colors.info} />
            <AppText variant="bodySmall" color="textPrimary" style={styles.infoText}>
              Bạn đã đặt cọc cho đơn này. Có thể thanh toán phần còn lại sau khi dịch vụ hoàn thành.
            </AppText>
          </View>
        )}

        {/* Amount to Pay Hero Card */}
        <View style={[styles.amountHeroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="caption" color="textSecondary" style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {TYPE_LABEL[payableType]}
          </AppText>
          <AppText variant="h1" color="primary" style={styles.amountHeroText}>
            {formatCurrency(computedAmount)}
          </AppText>
          <AppText variant="caption" color="textTertiary" style={{ lineHeight: 18 }}>
            {TYPE_DESCRIPTION[payableType]}
          </AppText>
        </View>

        {/* Payment Methods Section Header */}
        <AppText variant="h4" style={styles.sectionTitle}>
          Chọn phương thức thanh toán
        </AppText>

        {/* Payment Methods Options List */}
        <View style={styles.optionsList}>
          {PAYMENT_OPTIONS.map((option) => {
            const isSelected = selectedMethod === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedMethod(option.id)}
                activeOpacity={0.8}
                disabled={isDisabled}
              >
                <View
                  style={[
                    styles.paymentOptionCard,
                    {
                      backgroundColor: isSelected ? colors.surface : colors.surface,
                      borderColor: isSelected ? colors.primary : (colors.borderLight || '#E2E8F0'),
                      borderWidth: isSelected ? 2 : 1,
                      opacity: isDisabled ? 0.5 : 1,
                    },
                    isSelected && shadows.sm,
                  ]}
                >
                  {/* Left Icon Wrap */}
                  <View style={[styles.paymentOptionIconWrap, { backgroundColor: option.bg }]}>
                    <Icon name={option.icon} size={22} color={option.color} />
                  </View>

                  {/* Option info */}
                  <View style={styles.paymentOptionInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="body" style={{ fontWeight: '700', color: colors.textPrimary }}>
                        {option.name}
                      </AppText>
                      {option.badge ? (
                        <View style={[styles.badgeTag, { backgroundColor: `${option.color}1F` }]}>
                          <AppText style={[styles.badgeTagText, { color: option.color }]}>
                            {option.badge}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    <AppText
                      variant="caption"
                      style={{
                        marginTop: 2,
                        color: option.id === 'wallet' && walletBalance < computedAmount ? colors.error : colors.textSecondary,
                        fontWeight: option.id === 'wallet' ? '600' : '400',
                      }}
                    >
                      {option.id === 'wallet'
                        ? `Số dư: ${formatCurrency(walletBalance)}${walletBalance < computedAmount ? ' (Không đủ số dư)' : ' • Thanh toán tức thì'}`
                        : option.description}
                    </AppText>
                  </View>

                  {/* Radio / Check indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { borderColor: colors.border },
                    ]}
                  >
                    {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Security badge */}
        <View style={styles.securityNote}>
          <Icon name="shield-checkmark-outline" size={18} color={colors.success} />
          <AppText variant="caption" color="textSecondary" style={styles.securityText}>
            Thanh toán an toàn và bảo mật 100% qua AutoWash Pro
          </AppText>
        </View>
      </ScrollView>

      {/* Bottom Action Button Container */}
      <View style={bottomActionStyle}>
        <Button
          title={getButtonTitle()}
          onPress={handlePayment}
          loading={isProcessing}
          disabled={!bookingId || isProcessing || isDisabled}
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
  },
  scrollContentContainer: {
    padding: spacing.md,
    paddingBottom: 150,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: spacing.md,
    ...shadows.sm,
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
  dividerLine: {
    height: 1,
    marginVertical: spacing.md,
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
    fontWeight: '600',
  },
  infoCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  amountHeroCard: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  amountHeroText: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: spacing.xs,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: 12,
    marginBottom: spacing.md,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
  },
  paymentOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  badgeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  securityText: {
    flex: 1,
    lineHeight: 20,
  },
  bottomAction: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  cardTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  qrCaption: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  qrImage: {
    width: 240,
    height: 240,
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
  },
  txnId: {
    marginTop: spacing.sm,
  },
  successTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  successText: {
    textAlign: 'center',
  },
});

/**
 * AutoWashPro Booking Detail Screen
 * Polished detail view with:
 *   - gradient status header (semantic colors per status)
 *   - quick info sections (date, branch, package, vehicle, payment)
 *   - QR fullscreen viewer (modal) with share/copy
 *   - inline Cancel / Rebook / Feedback actions with destructive emphasis
 *   - color-semantic tokens (no hardcoded hex)
 *   - accessible labels & 44pt+ targets
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../src/contexts/AuthContext';
import { bookingApi, refundApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  Loading,
  BookingStatusBadge,
  PaymentStatusBadge,
  Icon,
  Icons,
  PressableScale,
  Header,
  ScreenContainer,
  BottomNavBar,
  AlertDialog,
  useToast,
  Input,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency, formatDate } from '../../src/utils';
import { LinearGradient } from 'expo-linear-gradient';
import type { Booking, BookingStatus } from '../../src/types';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRebooking, setIsRebooking] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  // Refund UI state
  const [refundRequestData, setRefundRequestData] = useState<any>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Cancel UI state — BE requires a cancellationReason on POST /bookings/:id/cancel.
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    if (!id) return;
    try {
      const response = await bookingApi.getBooking(id);
      setBooking(response);
      // Fetch QR separately — backend exposes it via /bookings/:id/qr.
      // Booking.qrCode is not populated on the Booking document itself.
      try {
        const qr = await bookingApi.getBookingQR(id);
        setQrDataUrl(qr.qrDataUrl || null);
      } catch {
        setQrDataUrl(null);
      }
      
      // Fetch refund requests if booking is cancelled and paid
      if (response.status === 'cancelled' && (response.depositPaid || response.paymentStatus === 'paid')) {
        try {
          const refunds = await refundApi.getMyRefundRequests();
          const match = refunds.find((r: any) => String(r.bookingId?._id || r.bookingId) === String(id));
          if (match) setRefundRequestData(match);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      AlertDialog.error('Lỗi', 'Không thể tải thông tin đặt lịch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!booking) return;
    setCancelReason('');
    setShowCancelModal(true);
  };

  const submitCancel = async () => {
    if (!id) return;
    const reason = cancelReason.trim();
    if (!reason) {
      AlertDialog.error('Thiếu lý do', 'Vui lòng nhập lý do hủy đặt lịch.');
      return;
    }
    setIsCancelling(true);
    try {
      await bookingApi.cancelBooking(id, reason);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setShowCancelModal(false);
      toast.success('Đã hủy đặt lịch', 'Đơn của bạn đã được hủy thành công');
      await fetchBooking();
    } catch (error: any) {
      AlertDialog.error(
        'Không thể hủy',
        error.response?.data?.message || 'Đã xảy ra lỗi khi hủy đặt lịch. Vui lòng thử lại.',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRebook = async () => {
    if (!booking) return;
    setIsRebooking(true);
    try {
      const branchId =
        typeof booking.branchId === 'object'
          ? booking.branchId._id
          : booking.branchId;
      const packageId =
        typeof booking.packageId === 'object'
          ? booking.packageId._id
          : booking.packageId;
      const vehicleId =
        typeof booking.vehicleId === 'object'
          ? booking.vehicleId._id
          : booking.vehicleId;
      router.push({
        pathname: '/booking',
        params: { branchId, packageId, vehicleId },
      } as any);
    } finally {
      setIsRebooking(false);
    }
  };

  const handlePayRemaining = () => {
    if (!booking) return;
    router.push(`/payment/select?bookingId=${booking._id}&type=remaining` as any);
  };

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      AlertDialog.error('Lỗi', 'Vui lòng nhập lý do hoàn tiền');
      return;
    }
    setIsRefunding(true);
    try {
      await refundApi.createRefundRequest(id!, refundReason);
      toast.success('Thành công', 'Yêu cầu hoàn tiền đã được gửi');
      setShowRefundModal(false);
      await fetchBooking();
    } catch (error: any) {
      AlertDialog.error(
        'Lỗi',
        error.response?.data?.message || 'Không thể gửi yêu cầu hoàn tiền'
      );
    } finally {
      setIsRefunding(false);
    }
  };

  if (isLoading) return <Loading fullScreen message="Đang tải..." />;

  if (!booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header showBack title="Chi tiết đặt lịch" />
        <View style={styles.notFound}>
          <Icon name={Icons.warning} size={48} color={colors.textTertiary} />
          <AppText variant="body" color="textSecondary" style={{ marginTop: spacing.md }}>
            Không tìm thấy thông tin đặt lịch
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const branchName = typeof booking.branchId === 'object' ? booking.branchId.name : '';
  const branchAddress =
    typeof booking.branchId === 'object' ? booking.branchId.address : '';
  const packageName =
    typeof booking.packageId === 'object' ? booking.packageId.name : '';
  const packageDuration =
    typeof booking.packageId === 'object' ? booking.packageId.duration : undefined;
  const vehicleInfo =
    typeof booking.vehicleId === 'object' ? booking.vehicleId : null;

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canRebook = booking.status === 'completed';
  const canFeedback = booking.status === 'completed' && !booking.rating;
  const canShowQR = ['confirmed', 'checked_in'].includes(booking.status);

  // Logic payment actions — match BE booking.service.js.
  // Thanh toán phần còn lại: đã cọc, dịch vụ đã hoàn thành (completed) hoặc
  // đang thực hiện. Manager thường đòi khách trả nốt sau khi xe sẵn sàng.
  const canPayRemaining =
    booking.depositPaid === true &&
    booking.paymentStatus !== 'paid' &&
    ['checked_in', 'in_progress', 'completed'].includes(booking.status);

  // Refund condition: booking cancelled, customer paid something, and no refund request exists yet
  const canRequestRefund =
    booking.status === 'cancelled' &&
    (booking.depositPaid || booking.paymentStatus === 'paid') &&
    !refundRequestData;

  const hasBottomActions =
    canCancel || canRebook || canPayRemaining || canRequestRefund;

  return (
    <ScreenContainer edges={['top']} background="subtle">
      <Header
        title="Chi tiết đặt lịch"
        showBack
        rightAction={
          <PressableScale
            onPress={() => router.push('/chat' as any)}
            accessibilityLabel="Chat với AI"
            style={styles.chatIconBtn}
          >
            <Icon name={Icons.chatOutline} size={20} color={colors.primary} />
          </PressableScale>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status hero */}
        <LinearGradient
          colors={[getStatusColor(booking.status, colors, 'dark'), colors.primary] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusHero}
        >
          <View style={styles.heroBlob} />
          <View style={styles.heroBlob2} />
          <View style={styles.statusHeroTop}>
            <View>
              <AppText variant="caption" style={styles.heroLabel}>
                Mã đặt lịch
              </AppText>
              <AppText variant="h2" style={styles.heroCode}>
                #{booking._id.slice(-8).toUpperCase()}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <BookingStatusBadge status={booking.status} />
            </View>
          </View>
          <View style={styles.statusBadgesRow}>
            <PaymentStatusBadge status={booking.paymentStatus} />
            {typeof booking.totalPrice === 'number' || booking.finalPrice ? (
              <View style={[styles.heroAmount]}>
                <Icon name={Icons.walletOutline} size={14} color="rgba(255,255,255,0.9)" />
                <AppText style={styles.heroAmountText}>
                  {formatCurrency(booking.finalPrice ?? booking.totalPrice)}
                </AppText>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* At-risk / late warning banner — web parity (BookingsHistory.jsx AtRiskBanner) */}
        {(booking.status === 'pending' || booking.status === 'confirmed') &&
          booking.lateWarningSentAt ? (
          <Card style={[
            { backgroundColor: colors.warningLight, marginBottom: spacing.md, padding: spacing.md },
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name={Icons.warning} size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" style={{ fontWeight: '700', color: colors.warning }}>
                  Bạn chưa check-in — sắp bị tự hủy!
                </AppText>
                {booking.suggestedSlotStartTime ? (
                  <AppText variant="caption" color="textSecondary">
                    Giờ trống gần nhất: {booking.suggestedSlotStartTime}
                  </AppText>
                ) : (
                  <AppText variant="caption" color="textSecondary">
                    Hãy đổi lịch sớm để tránh hủy tự động.
                  </AppText>
                )}
              </View>
              {booking.suggestedSlotStartTime ? (
                <Button 
                  title={`Đổi sang ${booking.suggestedSlotStartTime}`}
                  size="small"
                  loading={isRebooking}
                  onPress={async () => {
                    if (!id) return;
                    setIsRebooking(true);
                    try {
                      await bookingApi.updateBooking(id, { startTime: booking.suggestedSlotStartTime });
                      toast.success('Thành công', `Đã đổi giờ sang ${booking.suggestedSlotStartTime}`);
                      fetchBooking();
                    } catch (error: any) {
                      AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể đổi giờ');
                    } finally {
                      setIsRebooking(false);
                    }
                  }} 
                />
              ) : (
                <Button 
                  title="Đổi giờ" 
                  size="small" 
                  onPress={handleRebook} 
                />
              )}
            </View>
          </Card>
        ) : null}

        {/* Date & time */}
        <InfoCard
          icon={Icons.calendarOutline}
          iconBg={colors.primarySubtle}
          iconColor={colors.primary}
          title="Thời gian"
        >
          <AppText variant="body" style={{ fontWeight: '600' }}>
            {formatBookingDate(booking.bookingDate)}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {booking.startTime}
            {booking.endTime ? ` - ${booking.endTime}` : ''}
          </AppText>
          {(() => {
            const dt = new Date(`${format(parseISO(booking.bookingDate), 'yyyy-MM-dd')}T${booking.startTime}:00`);
            const inFuture = dt.getTime() > Date.now();
            return inFuture ? (
              <View style={[styles.upcomingPill, { backgroundColor: colors.successLight }]}>
                <Icon name={Icons.timeOutline} size={12} color={colors.success} />
                <AppText variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
                  Sắp tới
                </AppText>
              </View>
            ) : null;
          })()}
        </InfoCard>

        {/* Branch */}
        <InfoCard
          icon={Icons.locationOutline}
          iconBg={colors.infoLight}
          iconColor={colors.info}
          title="Chi nhánh"
        >
          <AppText variant="body" style={{ fontWeight: '600' }} numberOfLines={2}>
            {branchName}
          </AppText>
          {branchAddress ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {branchAddress}
            </AppText>
          ) : null}
        </InfoCard>

        {/* Service */}
        <InfoCard
          icon={Icons.sparkle}
          iconBg={colors.warningLight}
          iconColor={colors.warning}
          title="Dịch vụ"
        >
          <AppText variant="body" style={{ fontWeight: '600' }} numberOfLines={2}>
            {packageName}
          </AppText>
          {packageDuration ? (
            <AppText variant="caption" color="textSecondary">
              {packageDuration} phút
            </AppText>
          ) : null}
        </InfoCard>

        {/* Vehicle */}
        {vehicleInfo ? (
          <InfoCard
            icon={Icons.carOutline}
            iconBg={colors.successLight}
            iconColor={colors.success}
            title="Phương tiện"
          >
            <AppText variant="body" style={{ fontWeight: '600' }}>
              {vehicleInfo.licensePlate}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {vehicleInfo.brand} {vehicleInfo.model ? `• ${vehicleInfo.model}` : ''}
            </AppText>
          </InfoCard>
        ) : null}

        {/* Payment breakdown */}
        <Card style={{ marginBottom: spacing.md }}>
          <AppText variant="h4" style={{ marginBottom: spacing.sm }}>
            Chi tiết thanh toán
          </AppText>
          <RowBetween
            label="Tổng tiền"
            value={formatCurrency(booking.finalPrice ?? booking.totalPrice ?? 0)}
            bold
          />
          {booking.discountAmount && booking.discountAmount > 0 ? (
            <RowBetween
              label="Giảm giá"
              value={`-${formatCurrency(booking.discountAmount)}`}
              valueColor={colors.success}
            />
          ) : null}
          {booking.voucherCode ? (
            <RowBetween label="Voucher" value={booking.voucherCode} />
          ) : null}
          {(booking.depositAmount ?? 0) > 0 && booking.paymentStatus !== 'paid' ? (
            <>
              <RowBetween
                label={`Cọc (30%)`}
                value={
                  booking.depositPaid
                    ? `${formatCurrency(booking.depositAmount ?? 0)} (đã cọc)`
                    : `${formatCurrency(booking.depositAmount ?? 0)} (chưa cọc)`
                }
                valueColor={booking.depositPaid ? colors.success : colors.warning}
              />
              {booking.depositPaid ? (
                <RowBetween
                  label="Còn lại"
                  value={formatCurrency(
                    Math.max(
                      0,
                      (booking.finalPrice ?? 0) - (booking.depositAmount ?? 0),
                    ),
                  )}
                />
              ) : null}
            </>
          ) : null}
          {/* Legacy alias — tránh làm mất data booking cũ có field `deposit`. */}
          {booking.deposit && !booking.depositAmount ? (
            <RowBetween label="Đã cọc" value={formatCurrency(booking.deposit)} />
          ) : null}
        </Card>

        {/* QR Section */}
        {canShowQR ? (
          <Card style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="h4">Mã QR Check-in</AppText>
                <AppText variant="caption" color="textSecondary">
                  Đưa mã này cho nhân viên khi đến chi nhánh
                </AppText>
              </View>
              <Icon name={Icons.qrCodeOutline} size={28} color={colors.primary} />
            </View>
            <PressableScale
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setQrFullscreen(true);
              }}
              style={[styles.qrContainer, { backgroundColor: colors.background, borderColor: colors.border }]}
              accessibilityLabel="Mở mã QR toàn màn hình"
              accessibilityRole="button"
            >
              {qrDataUrl ? (
                <QRCode value={qrDataUrl} size={180} color={colors.textPrimary} backgroundColor={colors.background} />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Icon name={Icons.qrCodeOutline} size={48} color={colors.textTertiary} />
                  <AppText variant="caption" color="textTertiary">
                    Đang tạo QR…
                  </AppText>
                </View>
              )}
            </PressableScale>
            <AppText variant="caption" color="textSecondary" style={styles.qrHint}>
              Nhấn để mở toàn màn hình
            </AppText>
          </Card>
        ) : null}

        {/* Feedback */}
        {canFeedback ? (
          <Card style={[styles.feedbackCard, { backgroundColor: colors.warningLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <Icon name={Icons.starOutline} size={22} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: '600' }}>
                  Bạn đã sử dụng dịch vụ
                </AppText>
                <AppText variant="caption" color="textSecondary" style={{ marginBottom: spacing.sm }}>
                  Hãy đánh giá để giúp chúng tôi cải thiện dịch vụ tốt hơn
                </AppText>
                <Button
                  title="Đánh giá ngay"
                  variant="outline"
                  icon={<Icon name={Icons.star} size={18} color={colors.warning} />}
                  onPress={() => router.push(`/booking/${id}/feedback` as any)}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {booking.rating ? (
          <Card style={{ marginBottom: spacing.md }}>
            <AppText variant="h4" style={{ marginBottom: spacing.sm }}>
              Đánh giá của bạn
            </AppText>
            <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={star <= (booking.rating || 0) ? Icons.star : Icons.starOutline}
                  size={24}
                  color={star <= (booking.rating || 0) ? colors.warning : colors.textTertiary}
                />
              ))}
            </View>
            {booking.feedback ? (
              <AppText variant="body" color="textSecondary">
                {booking.feedback}
              </AppText>
            ) : null}
            {booking.reply ? (
              <View style={[styles.replyBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <AppText variant="caption" color="textTertiary" style={{ marginBottom: 2 }}>
                  Phản hồi từ chi nhánh
                </AppText>
                <AppText variant="bodySmall">{booking.reply}</AppText>
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* Note */}
        {booking.note ? (
          <Card style={{ marginBottom: spacing.md }}>
            <AppText variant="label" color="textSecondary" style={{ marginBottom: 4 }}>
              Ghi chú
            </AppText>
            <AppText variant="body">{booking.note}</AppText>
          </Card>
        ) : null}
      </ScrollView>

      {/* Bottom actions — nằm phía trên thanh điều hướng dưới cùng */}
      {hasBottomActions ? (
        <View style={{ backgroundColor: colors.background, marginBottom: 68 + insets.bottom }}>
          <View
            style={[
              styles.bottomAction,
              { borderTopColor: colors.border },
            ]}
          >
          {(() => {
            // Nút thanh toán: chỉ còn "Thanh toán phần còn lại".
            // Nút "Đặt cọc" đã được gỡ bỏ theo yêu cầu (thanh toán cọc xử lý ở luồng đặt lịch).
            const primaryPaymentAction = canPayRemaining ? (
              <Button
                title="Thanh toán phần còn lại"
                size="medium"
                icon={<Icon name={Icons.walletOutline} size={18} color={colors.textInverse} />}
                onPress={handlePayRemaining}
                style={styles.actionFlex}
              />
            ) : null;

            if (canRebook && canCancel) {
              return (
                <>
                  <Button
                    title="Đặt lại"
                    variant="outline"
                    size="medium"
                    icon={<Icon name={Icons.refreshOutline} size={18} color={colors.primary} />}
                    onPress={handleRebook}
                    loading={isRebooking}
                    style={styles.actionFlex}
                  />
                  {primaryPaymentAction}
                  <Button
                    title="Hủy đặt lịch"
                    variant="danger"
                    size="medium"
                    onPress={handleCancel}
                    loading={isCancelling}
                    style={styles.actionFlex}
                  />
                </>
              );
            }
            if (canCancel) {
              return (
                <>
                  {primaryPaymentAction ? (
                    <View style={{ flexDirection: 'row', gap: spacing.sm, flex: 1 }}>
                      {primaryPaymentAction}
                      <Button
                        title="Hủy đặt lịch"
                        variant="danger"
                        size="medium"
                        onPress={handleCancel}
                        loading={isCancelling}
                        style={styles.actionFlex}
                      />
                    </View>
                  ) : (
                    <View style={styles.singleActionWrap}>
                      <Button
                        title="Hủy đặt lịch"
                        variant="danger"
                        size="medium"
                        onPress={handleCancel}
                        loading={isCancelling}
                        fullWidth
                      />
                    </View>
                  )}
                </>
              );
            }
            if (canRebook) {
              return (
                <>
                  {primaryPaymentAction}
                  <Button
                    title="Đặt lại"
                    variant="outline"
                    size="medium"
                    icon={<Icon name={Icons.refreshOutline} size={18} color={colors.primary} />}
                    onPress={handleRebook}
                    loading={isRebooking}
                    style={styles.actionFlex}
                  />
                </>
              );
            }
            if (canRequestRefund) {
              return (
                <View style={styles.singleActionWrap}>
                  <Button
                    title="Yêu cầu hoàn tiền"
                    size="medium"
                    icon={<Icon name={Icons.cashOutline} size={18} color={colors.textInverse} />}
                    onPress={() => setShowRefundModal(true)}
                    fullWidth
                  />
                </View>
              );
            }
            if (primaryPaymentAction) {
              return <View style={styles.singleActionWrap}>{primaryPaymentAction}</View>;
            }
            return null;
          })()}
          </View>
        </View>
      ) : null}

      <BottomNavBar />

      {/* Cancel Confirmation Modal — nhập lý do hủy (BE yêu cầu cancellationReason) */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h4">Xác nhận hủy đặt lịch</AppText>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Icon name={Icons.close} size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <AppText variant="body" color="textSecondary" style={{ marginBottom: spacing.md }}>
              Bạn có chắc chắn muốn hủy đơn này? Vui lòng cho chúng tôi biết lý do hủy.
              Hành động này không thể hoàn tác.
            </AppText>
            <Input
              label="Lý do hủy"
              placeholder="Nhập lý do hủy đặt lịch..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <Button
                title="Quay lại"
                variant="outline"
                onPress={() => setShowCancelModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Xác nhận hủy"
                variant="danger"
                onPress={submitCancel}
                loading={isCancelling}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Refund Request Modal */}
      <Modal
        visible={showRefundModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h4">Yêu cầu hoàn tiền</AppText>
              <TouchableOpacity onPress={() => setShowRefundModal(false)}>
                <Icon name={Icons.close} size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <AppText variant="body" color="textSecondary" style={{ marginBottom: spacing.md }}>
              Vui lòng cho chúng tôi biết lý do bạn muốn hoàn tiền cho đặt lịch này.
            </AppText>
            <Input
              label="Lý do hoàn tiền"
              placeholder="Nhập lý do..."
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
              numberOfLines={3}
              inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <Button
                title="Hủy"
                variant="outline"
                onPress={() => setShowRefundModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Gửi yêu cầu"
                onPress={handleRefundRequest}
                loading={isRefunding}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Fullscreen Modal */}
      <Modal
        visible={qrFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setQrFullscreen(false)}
        statusBarTranslucent
      >
        <View style={styles.qrModal}>
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.92)" />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.qrModalHeader}>
              <TouchableOpacity
                onPress={() => setQrFullscreen(false)}
                style={styles.qrModalClose}
                accessibilityLabel="Đóng"
              >
                <Icon name={Icons.close} size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <AppText variant="h4" style={styles.qrModalTitle}>
                Mã QR Check-in
              </AppText>
              <View style={{ width: 44 }} />
            </View>
            <View style={styles.qrModalContent}>
              {qrDataUrl ? (
                <>
                  <QRCode value={qrDataUrl} size={260} color="#0F172A" backgroundColor="#FFFFFF" />
                  <AppText variant="body" style={styles.qrModalCode}>
                    #{booking._id.slice(-8).toUpperCase()}
                  </AppText>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)" style={styles.qrModalHint}>
                    Đưa mã này cho nhân viên tại quầy check-in
                  </AppText>
                </>
              ) : (
                <AppText style={{ color: '#FFF' }}>Đang tạo QR…</AppText>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

interface InfoCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, iconBg, iconColor, title, children }) => {
  const colors = useColors();
  return (
    <Card style={styles.infoCard}>
      <View style={styles.infoCardRow}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="textSecondary" style={{ marginBottom: 2 }}>
            {title}
          </AppText>
          {children}
        </View>
      </View>
    </Card>
  );
};

const RowBetween: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}> = ({ label, value, bold, valueColor }) => {
  const colors = useColors();
  return (
    <View style={styles.rowBetween}>
      <AppText variant="body" color="textSecondary">
        {label}
      </AppText>
      <AppText
        variant="body"
        style={{
          fontWeight: bold ? '700' : '500',
          color: valueColor || colors.textPrimary,
        }}
      >
        {value}
      </AppText>
    </View>
  );
};

function formatBookingDate(raw?: string | Date): string {
  if (!raw) return '';
  const d = typeof raw === 'string' ? parseISO(raw) : raw;
  if (Number.isNaN(d.getTime())) return String(raw);
  return format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
}

function getStatusColor(
  status: BookingStatus,
  colors: any,
  _variant: 'dark' | 'light' = 'dark',
): string {
  switch (status) {
    case 'pending':
      return colors.warning;
    case 'confirmed':
      return colors.primary;
    case 'checked_in':
      return colors.statusCheckedIn;
    case 'in_progress':
      return colors.statusInProgress;
    case 'completed':
      return colors.success;
    case 'cancelled':
      return colors.error;
    default:
      return colors.primaryDark;
  }
}

void formatDate;

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statusHero: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -50,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBlob2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -50,
    left: -30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statusBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroCode: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  heroAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  heroAmountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    marginBottom: spacing.sm,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  upcomingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  qrCard: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  qrContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  qrHint: {
    marginTop: spacing.xs,
  },
  feedbackCard: {
    marginBottom: spacing.md,
  },
  replyBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  bottomAction: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionFlex: {
    flex: 1,
  },
  singleActionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  // Refund Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  // QR Modal
  qrModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  qrModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  qrModalClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  qrModalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  qrModalCode: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  qrModalHint: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
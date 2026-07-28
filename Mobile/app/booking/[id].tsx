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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
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
  EmptyState,
  RefundStatusCard,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency, formatDate } from '../../src/utils';
import { LinearGradient } from 'expo-linear-gradient';
import type { Booking, BookingStatus } from '../../src/types';

// Local type — captures whatever shape BE returns from POST /refund-requests.
// BE doesn't always return the same field set, so we keep all fields optional.
interface RefundRequest {
  _id?: string;
  id?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | string;
  reason?: string;
  refundAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  managerReply?: string;
  processedAt?: string;
  [k: string]: any;
}

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
  const [isServiceExpanded, setIsServiceExpanded] = useState(false);

  // Refund UI state
  const [refundRequest, setRefundRequest] = useState<RefundRequest | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const refundSectionRef = useRef<View | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
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
      
      // Fetch refund requests (any status) for this booking — survives reloads.
      try {
        const refunds = await refundApi.getMyRefundRequests();
        const match = refunds.find(
          (r: any) => String(r.bookingId?._id || r.bookingId) === String(id)
        );
        if (match) {
          setRefundRequest({
            ...match,
            status: match.status || 'pending',
          });
        }
      } catch {
        // ignore — refund status is optional
      }
    } catch (error: any) {
      console.log('Booking not found or error fetching:', error.message || error);
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
      const created = await refundApi.createRefundRequest(id!, refundReason);
      // Capture local refund request state so the UI can show status.
      // BE response shape varies — accept anything truthy that has a status or id.
      const isDepositOnly = booking?.paymentStatus === 'deposit_paid' || (booking?.depositPaid && booking?.paymentStatus !== 'paid');
      const actualDeposit = booking?.depositAmount || (booking as any)?.deposit;
      const expectedRefund = isDepositOnly && actualDeposit ? actualDeposit : (booking?.finalPrice ?? booking?.totalPrice);

      const normalized: RefundRequest = {
        ...(created || {}),
        status: created?.status || 'pending',
        reason: created?.reason || refundReason,
        createdAt: created?.createdAt || new Date().toISOString(),
        refundAmount: created?.refundAmount ?? expectedRefund,
      };
      setRefundRequest(normalized);
      setShowRefundModal(false);
      // Card now lives at the TOP of the ScrollView (right under the warning banner),
      // so a simple scrollTo({y:0}) reliably brings it into view.
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 450);
      toast.success('Thành công', 'Yêu cầu hoàn tiền đã được gửi');
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
      <ScreenContainer>
        <Header showBack title="Chi tiết đặt lịch" />
        <EmptyState
          iconName={Icons.calendarOutline}
          title="Không tìm thấy lịch hẹn"
          message="Lịch hẹn này không tồn tại hoặc đã bị xóa khỏi hệ thống."
          actionLabel="Quay lại"
          onAction={() => router.back()}
        />
      </ScreenContainer>
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
    !refundRequest;

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
        ref={scrollViewRef}
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

        {/* Active refund status card — placed near the top so user sees it immediately
            when one exists. RefundStatusCard is self-animating on mount. */}
        {refundRequest ? (
          <View ref={refundSectionRef} collapsable={false}>
            <RefundStatusCard request={refundRequest} />
          </View>
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
        {(() => {
          const subServicesList = booking.selectedSubServices || booking.subServices;
          const hasSubServices = subServicesList && subServicesList.length > 0;
          const packageDesc = typeof booking.packageId === 'object' ? (booking.packageId as any)?.description : undefined;
          const hasExpandableContent = hasSubServices || !!packageDesc;

          return (
            <InfoCard
              icon={Icons.sparkle}
              iconBg={colors.warningLight}
              iconColor={colors.warning}
              title="Dịch vụ & Gói chăm sóc"
              onPress={hasExpandableContent ? () => setIsServiceExpanded(prev => !prev) : undefined}
              rightAction={
                hasExpandableContent ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText variant="caption" color="textSecondary" style={{ marginRight: 2, fontSize: 11 }}>
                      {isServiceExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                    </AppText>
                    <Icon
                      name={isServiceExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                ) : null
              }
            >
              <AppText variant="body" style={{ fontWeight: '700' }} numberOfLines={2}>
                {packageName}
              </AppText>
              {packageDuration ? (
                <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  ⏱️ Thời gian thực hiện: {packageDuration} phút
                </AppText>
              ) : null}

              {/* Expandable sub-services & package details */}
              {isServiceExpanded && hasExpandableContent ? (
                <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                  {packageDesc ? (
                    <AppText variant="caption" color="textSecondary" style={{ marginBottom: 6, lineHeight: 18 }}>
                      {packageDesc}
                    </AppText>
                  ) : null}

                  {hasSubServices ? (
                    <View>
                      <AppText variant="caption" color="primary" style={{ fontWeight: '700', marginBottom: 4 }}>
                        Dịch vụ đính kèm ({subServicesList.length}):
                      </AppText>
                      {subServicesList.map((sub: any, idx: number) => {
                        const subName = typeof sub === 'object' ? sub.name : sub;
                        const subPrice = typeof sub === 'object' ? sub.price : undefined;
                        return (
                          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                            <AppText variant="caption" color="textSecondary">
                              • {subName}
                            </AppText>
                            {subPrice ? (
                              <AppText variant="caption" color="textPrimary" style={{ fontWeight: '600' }}>
                                +{formatCurrency(subPrice)}
                              </AppText>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </InfoCard>
          );
        })()}

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
            if (canRequestRefund && !refundRequest) {
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
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowCancelModal(false);
          }}
          accessibilityLabel="Đóng hộp thoại"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKavWrapper}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                {/* Premium danger hero with gradient + decorative blob */}
                <LinearGradient
                  colors={['#FEF2F2', `${colors.error}1A`] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cancelHero}
                >
                  {/* Decorative red blob */}
                  <View style={[styles.cancelHeroBlob, { backgroundColor: `${colors.error}1F` }]} />
                  <View style={styles.cancelHeroBlob2} />
                  <View style={styles.cancelHeroIconWrap}>
                    <Icon name={Icons.errorOutline} size={26} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cancelHeroTitle}>Xác nhận hủy đặt lịch</Text>
                    <Text style={styles.cancelHeroSubtitle}>Hành động này không thể hoàn tác</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCancelModal(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.cancelHeroClose}
                    accessibilityLabel="Đóng"
                    accessibilityRole="button"
                  >
                    <Icon name={Icons.close} size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </LinearGradient>

                <ScrollView
                  style={styles.cancelBody}
                  contentContainerStyle={styles.cancelBodyContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <AppText variant="body" color="textSecondary" style={styles.cancelIntro}>
                    Bạn có chắc chắn muốn hủy đơn này? Vui lòng cho chúng tôi biết lý do hủy.
                  </AppText>

                  <Text style={styles.cancelReasonLabel}>Lý do hủy</Text>
                  <Input
                    placeholder="Nhập lý do hủy đặt lịch..."
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    multiline
                    numberOfLines={3}
                    inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
                    containerStyle={styles.cancelInputContainer}
                  />

                  <View style={styles.cancelActions}>
                    <TouchableOpacity
                      style={[styles.cancelBackBtn, { borderColor: colors.border }]}
                      onPress={() => setShowCancelModal(false)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.cancelBackBtnText, { color: colors.textPrimary }]}>Quay lại</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cancelConfirmBtn, isCancelling && { opacity: 0.7 }]}
                      onPress={submitCancel}
                      disabled={isCancelling}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                    >
                      <LinearGradient
                        colors={['#EF4444', '#B91C1C'] as const}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cancelConfirmGradient}
                      >
                        {/* Decorative white blob for depth */}
                        <View style={styles.cancelConfirmBlob} />
                        {isCancelling ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.cancelConfirmText}>Xác nhận hủy</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Refund Request Modal — premium info-blue hero */}
      <Modal
        visible={showRefundModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRefundModal(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowRefundModal(false);
          }}
          accessibilityLabel="Đóng hộp thoại"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKavWrapper}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                {/* Premium info-blue hero with gradient + decorative blobs */}
                <LinearGradient
                  colors={[colors.infoLight, `${colors.info}1A`] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.refundHero}
                >
                  {/* Decorative blobs */}
                  <View style={[styles.refundHeroBlob, { backgroundColor: `${colors.info}1F` }]} />
                  <View style={styles.refundHeroBlob2} />
                  <View style={styles.refundHeroIconWrap}>
                    <Icon name={Icons.refresh || Icons.help} size={26} color={colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refundHeroTitle}>Yêu cầu hoàn tiền</Text>
                    <Text style={styles.refundHeroSubtitle}>Chúng tôi sẽ phản hồi trong 24 giờ</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowRefundModal(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.refundHeroClose}
                    accessibilityLabel="Đóng"
                    accessibilityRole="button"
                  >
                    <Icon name={Icons.close} size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </LinearGradient>

                <ScrollView
                  style={styles.refundBody}
                  contentContainerStyle={styles.refundBodyContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <AppText variant="body" color="textSecondary" style={styles.refundIntro}>
                    Vui lòng cho chúng tôi biết lý do bạn muốn hoàn tiền cho đặt lịch này.
                  </AppText>

                  <Text style={styles.refundReasonLabel}>Lý do hoàn tiền</Text>
                  <Input
                    placeholder="Nhập lý do hoàn tiền..."
                    value={refundReason}
                    onChangeText={setRefundReason}
                    multiline
                    numberOfLines={3}
                    inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
                    containerStyle={styles.refundInputContainer}
                  />

                  <View style={styles.refundActions}>
                    <TouchableOpacity
                      style={[styles.refundBackBtn, { borderColor: colors.border }]}
                      onPress={() => setShowRefundModal(false)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.refundBackBtnText, { color: colors.textPrimary }]}>Hủy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.refundConfirmBtn, isRefunding && { opacity: 0.7 }]}
                      onPress={handleRefundRequest}
                      disabled={isRefunding}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                    >
                      <LinearGradient
                        colors={[colors.info, colors.primary] as const}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.refundConfirmGradient}
                      >
                        <View style={styles.refundConfirmBlob} />
                        {isRefunding ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.refundConfirmText}>Gửi yêu cầu</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Pressable>
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
  rightAction?: React.ReactNode;
  onPress?: () => void;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  children,
  rightAction,
  onPress,
}) => {
  const colors = useColors();
  const cardContent = (
    <Card style={styles.infoCard}>
      <View style={styles.infoCardRow}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <AppText variant="caption" color="textSecondary">
              {title}
            </AppText>
            {rightAction}
          </View>
          {children}
        </View>
      </View>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }
  return cardContent;
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
    // Big bottom padding so the last card (Chi tiết thanh toán) doesn't kiss the
    // sticky bottom actions bar (~80-100px) + bottom nav (~68px + insets).
    paddingBottom: spacing.xxl + 120,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
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
    borderWidth: 1,
    borderColor: '#F1F5F9', // colors.borderLight
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
    borderColor: '#E2E8F0', // colors.border
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    borderWidth: 1,
    borderColor: '#F1F5F9', // colors.borderLight
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)', // slate-900 65% — fully dims page behind
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  modalKavWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: 0, // body+hero handle their own padding
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF', // explicit opaque background — prevents modal from showing page content through
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9', // colors.borderLight
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  // Cancel modal — premium hero + body
  cancelHero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA', // red-200 — matches warning palette
  },
  cancelHeroBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    right: -30,
  },
  cancelHeroBlob2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.5)',
    bottom: -30,
    left: -20,
  },
  cancelHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelHeroTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 2,
  },
  cancelHeroSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: '#991B1B', // red-800 — high contrast on light red
  },
  cancelHeroClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cancelBody: {
    // ScrollView outer — no flex grow so modal stays compact when no scroll needed
    flexGrow: 0,
  },
  cancelBodyContent: {
    padding: spacing.lg,
  },
  cancelIntro: {
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  cancelReasonLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#0F172A', // textPrimary
    marginBottom: spacing.xs,
  },
  cancelInputContainer: {
    marginBottom: spacing.lg,
    borderRadius: 14,
  },
  cancelActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBackBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cancelBackBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  cancelConfirmBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelConfirmGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cancelConfirmBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -50,
    right: -30,
  },
  cancelConfirmText: {
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  // Refund modal — premium info-blue hero + body (mirrors cancel pattern)
  refundHero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD', // sky-200 — matches info palette
  },
  refundHeroBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    right: -30,
  },
  refundHeroBlob2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.5)',
    bottom: -30,
    left: -20,
  },
  refundHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
  refundHeroTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
    color: '#0F172A', // textPrimary
    zIndex: 2,
  },
  refundHeroSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: '#475569', // textSecondary
    marginTop: 2,
    zIndex: 2,
  },
  refundHeroClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  refundBody: {
    flexGrow: 0,
  },
  refundBodyContent: {
    padding: spacing.lg,
  },
  refundIntro: {
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  refundReasonLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#0F172A', // textPrimary
    marginBottom: spacing.xs,
  },
  refundInputContainer: {
    marginBottom: spacing.lg,
    borderRadius: 14,
  },
  refundActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  refundBackBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  refundBackBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  refundConfirmBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  refundConfirmGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  refundConfirmBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -50,
    right: -30,
  },
  refundConfirmText: {
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.2,
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
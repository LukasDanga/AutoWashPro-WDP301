/**
 * AutoWashPro Booking Detail Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../../src/contexts/AuthContext';
import { bookingApi } from '../../src/api';
import QRCode from 'react-native-qrcode-svg';
import { 
  Text as AppText, 
  Card, 
  Button,
  Loading,
  BookingStatusBadge,
  PaymentStatusBadge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Booking } from '../../src/types';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const fetchBooking = async () => {
    if (!id) return;

    try {
      const response = await bookingApi.getBooking(id);
      setBooking(response);
    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt lịch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Hủy đặt lịch',
      'Bạn có chắc chắn muốn hủy đặt lịch này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsCancelling(true);
            try {
              await bookingApi.cancelBooking(id);
              Alert.alert('Thành công', 'Đã hủy đặt lịch');
              fetchBooking();
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể hủy đặt lịch');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleRebook = () => {
    if (!booking) return;
    router.push({
      pathname: '/booking',
      params: {
        branchId: typeof booking.branchId === 'object' ? booking.branchId._id : undefined,
        packageId: typeof booking.packageId === 'object' ? booking.packageId._id : undefined,
        vehicleId: typeof booking.vehicleId === 'object' ? booking.vehicleId._id : undefined,
      },
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount || isNaN(amount)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <AppText variant="body">Không tìm thấy thông tin đặt lịch</AppText>
      </SafeAreaView>
    );
  }

  const branchName = typeof booking.branchId === 'object' ? booking.branchId.name : '';
  const packageName = typeof booking.packageId === 'object' ? booking.packageId.name : '';
  const vehicleInfo = typeof booking.vehicleId === 'object' ? booking.vehicleId : null;

  const formatBookingDate = (raw?: string | Date): string => {
    if (!raw) return '';
    const d = typeof raw === 'string' ? parseISO(raw) : raw;
    if (Number.isNaN(d.getTime())) return String(raw);
    return format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
  };

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canRebook = booking.status === 'completed';
  const canFeedback = booking.status === 'completed' && !booking.rating;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Chi tiết đặt lịch</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <AppText variant="caption" color="textSecondary">
                Mã đặt lịch
              </AppText>
              <AppText variant="h4">{booking._id.slice(-8).toUpperCase()}</AppText>
            </View>
            <View style={styles.statusBadges}>
              <BookingStatusBadge status={booking.status} />
              <View style={{ height: 8 }} />
              <PaymentStatusBadge status={booking.paymentStatus} />
            </View>
          </View>
        </Card>

        {/* Date & Time Card */}
        <Card style={styles.infoCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Thời gian
          </AppText>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View>
              <AppText variant="body">{formatBookingDate(booking.bookingDate)}</AppText>
              <AppText variant="caption" color="textSecondary">
                {booking.startTime} - {booking.endTime || '...'}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Branch Card */}
        <Card style={styles.infoCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Chi nhánh
          </AppText>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View>
              <AppText variant="body">{branchName}</AppText>
              {typeof booking.branchId === 'object' && (
                <AppText variant="caption" color="textSecondary">
                  {booking.branchId.address}
                </AppText>
              )}
            </View>
          </View>
        </Card>

        {/* Package Card */}
        <Card style={styles.infoCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Dịch vụ
          </AppText>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>✨</Text>
            <View>
              <AppText variant="body">{packageName}</AppText>
              {typeof booking.packageId === 'object' && (
                <AppText variant="caption" color="textSecondary">
                  {booking.packageId.duration} phút
                </AppText>
              )}
            </View>
          </View>
        </Card>

        {/* Vehicle Card */}
        {vehicleInfo && (
          <Card style={styles.infoCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Phương tiện
            </AppText>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🚗</Text>
              <View>
                <AppText variant="body">{vehicleInfo.licensePlate}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {vehicleInfo.brand} {vehicleInfo.model && `• ${vehicleInfo.model}`}
                </AppText>
              </View>
            </View>
          </Card>
        )}

        {/* Payment Card */}
        <Card style={styles.infoCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Thanh toán
          </AppText>
          <View style={styles.paymentRow}>
            <AppText variant="body">Tổng tiền</AppText>
            <AppText variant="h3" color="primary">
              {formatCurrency(booking.finalPrice ?? booking.totalPrice)}
            </AppText>
          </View>
          {booking.discountAmount && booking.discountAmount > 0 ? (
            <View style={styles.paymentRow}>
              <AppText variant="body" color="textSecondary">Giảm giá</AppText>
              <AppText variant="body" color="success">
                -{formatCurrency(booking.discountAmount)}
              </AppText>
            </View>
          ) : null}
          {booking.voucherCode ? (
            <View style={styles.paymentRow}>
              <AppText variant="body" color="textSecondary">Voucher</AppText>
              <AppText variant="body">{booking.voucherCode}</AppText>
            </View>
          ) : null}
        </Card>

        {/* QR Code Section */}
        {['confirmed', 'checked_in'].includes(booking.status) && (
          <Card style={styles.qrCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Mã QR Check-in
            </AppText>
            <TouchableOpacity 
              style={styles.qrContainer}
              onPress={() => setShowQR(!showQR)}
            >
              {booking.qrCode ? (
                <QRCode value={booking.qrCode} size={200} />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>📱</Text>
                  <AppText variant="body" color="textSecondary">
                    Quét mã khi đến
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
            <AppText variant="caption" color="textSecondary" style={styles.qrHint}>
              {showQR ? 'Nhấn để ẩn QR' : 'Nhấn để hiện QR'}
            </AppText>
          </Card>
        )}

        {/* Feedback Section */}
        {canFeedback && (
          <Card style={styles.feedbackCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Đánh giá dịch vụ
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.feedbackText}>
              Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ
            </AppText>
            <Button
              title="Đánh giá ngay"
              variant="outline"
              onPress={() => router.push(`/booking/${id}/feedback`)}
            />
          </Card>
        )}

        {booking.rating && (
          <Card style={styles.feedbackCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Đánh giá của bạn
            </AppText>
            <View style={styles.ratingDisplay}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={styles.ratingStar}>
                  {star <= (booking.rating || 0) ? '⭐' : '☆'}
                </Text>
              ))}
            </View>
            {booking.feedback && (
              <AppText variant="body" style={styles.feedbackContent}>
                {booking.feedback}
              </AppText>
            )}
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {canCancel && (
          <Button
            title="Hủy đặt lịch"
            variant="outline"
            onPress={handleCancel}
            loading={isCancelling}
            style={styles.cancelButton}
          />
        )}
        {canRebook && (
          <Button
            title="Đặt lại"
            onPress={handleRebook}
            style={styles.rebookButton}
          />
        )}
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
  statusCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadges: {
    alignItems: 'flex-end',
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  qrCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.md,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  qrPlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  qrHint: {
    marginTop: spacing.sm,
  },
  feedbackCard: {
    marginBottom: spacing.md,
  },
  feedbackText: {
    marginBottom: spacing.md,
  },
  ratingDisplay: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  ratingStar: {
    fontSize: 24,
    marginRight: spacing.xs,
  },
  feedbackContent: {
    marginTop: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  rebookButton: {
    flex: 1,
  },
});

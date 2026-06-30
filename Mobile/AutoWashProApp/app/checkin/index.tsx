/**
 * AutoWashPro QR Check-in Screen
 * View booking QR code for staff scanning
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { bookingApi } from '../../src/api/booking';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card, Loading, Button } from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Booking } from '../../src/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type Mode = 'view' | 'scan' | 'manual';

export default function CheckInScreen() {
  const { id, mode: paramMode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>((paramMode as Mode) || 'view');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const fetchBookingQR = useCallback(async (bookingId: string) => {
    setLoading(true);
    try {
      const [bookingData, qrData] = await Promise.all([
        bookingApi.getBooking(bookingId),
        bookingApi.getBookingQR(bookingId),
      ]);
      setBooking(bookingData);
      // qrCode in booking or qrData.qrCode
      setQrDataUrl(qrData.qrCode || (qrData as any).qrDataUrl || null);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể tải thông tin booking');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchBookingQR(id);
    } else {
      setLoading(false);
    }
  }, [id, fetchBookingQR]);

  const handleCheckIn = useCallback(async () => {
    if (!booking) return;
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      Alert.alert('Không thể check-in', 'Booking này không ở trạng thái có thể check-in.');
      return;
    }

    Alert.alert(
      'Xác nhận Check-in',
      `Bạn có chắc muốn check-in cho lịch rửa xe này?\n\n📍 Chi nhánh: ${typeof booking.branchId === 'object' ? booking.branchId.name : '—'}\n📅 Ngày: ${format(new Date(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })}\n⏰ Giờ: ${booking.startTime}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Check-in ngay',
          onPress: async () => {
            setCheckingIn(true);
            try {
              // Call backend status update
              const apiClient = (await import('../../src/api/client')).apiClient;
              await apiClient.patch(`/bookings/${booking._id}/status`, {
                status: 'checked_in',
              });
              setCheckInSuccess(true);
              // Refresh booking data
              await fetchBookingQR(booking._id);
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || 'Không thể check-in. Vui lòng thử lại.'
              );
            } finally {
              setCheckingIn(false);
            }
          },
        },
      ]
    );
  }, [booking, fetchBookingQR]);

  if (loading) {
    return <Loading fullScreen message="Đang tải thông tin..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in QR</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        {[
          { key: 'view', label: 'Xem QR', icon: '📱' },
          { key: 'scan', label: 'Quét QR', icon: '📷' },
          { key: 'manual', label: 'Nhập mã', icon: '⌨️' },
        ].map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeButton, mode === m.key && styles.modeButtonActive]}
            onPress={() => setMode(m.key as Mode)}
          >
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── View Mode: Show QR ── */}
        {mode === 'view' && (
          <View>
            {booking ? (
              <>
                <BookingInfoCard booking={booking} />
                <QRDisplayCard qrDataUrl={qrDataUrl} booking={booking} />
                <CheckInAction
                  booking={booking}
                  checkingIn={checkingIn}
                  checkInSuccess={checkInSuccess}
                  onCheckIn={handleCheckIn}
                />
              </>
            ) : (
              <NoBookingCard onSelectMode={() => setMode('manual')} />
            )}
          </View>
        )}

        {/* ── Scan Mode ── */}
        {mode === 'scan' && (
          <ScanModeContent onScanned={(data) => {
            // Parse QR payload: { bookingId, branchId }
            try {
              const payload = JSON.parse(data);
              if (payload.bookingId) {
                router.push({ pathname: '/checkin', params: { id: payload.bookingId, mode: 'view' } });
                setMode('view');
              } else {
                Alert.alert('QR không hợp lệ', 'Mã QR không chứa thông tin booking hợp lệ.');
              }
            } catch {
              Alert.alert('QR không hợp lệ', 'Mã QR không đúng định dạng AutoWashPro.');
            }
          }} />
        )}

        {/* ── Manual Mode ── */}
        {mode === 'manual' && (
          <ManualEntryContent
            onFound={(bookingId) => {
              fetchBookingQR(bookingId);
              setMode('view');
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const BookingInfoCard: React.FC<{ booking: Booking }> = ({ booking }) => {
  const branchName = typeof booking.branchId === 'object'
    ? booking.branchId.name
    : '—';
  const pkgName = typeof booking.packageId === 'object'
    ? booking.packageId.name
    : '—';
  const vehiclePlate = typeof booking.vehicleId === 'object'
    ? booking.vehicleId.licensePlate
    : '—';

  return (
    <Card style={styles.infoCard} padding={spacing.lg}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoTitle}>Thông tin lịch hẹn</Text>
        <StatusBadge status={booking.status} />
      </View>
      <View style={styles.infoGrid}>
        <InfoRow icon="📍" label="Chi nhánh" value={branchName} />
        <InfoRow icon="🔧" label="Dịch vụ" value={pkgName} />
        <InfoRow icon="🚗" label="Biển số" value={vehiclePlate} />
        <InfoRow
          icon="📅"
          label="Ngày"
          value={format(new Date(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })}
        />
        <InfoRow icon="⏰" label="Giờ" value={booking.startTime} />
        <InfoRow
          icon="💰"
          label="Thanh toán"
          value={booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
        />
      </View>
    </Card>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon, label, value,
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoRowIcon}>{icon}</Text>
    <Text style={styles.infoRowLabel}>{label}</Text>
    <Text style={styles.infoRowValue}>{value}</Text>
  </View>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: colors.warning, bg: colors.warningLight, label: 'Chờ xác nhận' },
    confirmed: { color: colors.info, bg: colors.infoLight, label: 'Đã xác nhận' },
    checked_in: { color: colors.primary, bg: colors.primaryLight, label: 'Đã check-in' },
    in_progress: { color: colors.accent, bg: colors.infoLight, label: 'Đang rửa' },
    completed: { color: colors.success, bg: colors.successLight, label: 'Hoàn thành' },
    cancelled: { color: colors.error, bg: colors.errorLight, label: 'Đã hủy' },
  };
  const cfg = map[status] || { color: colors.textSecondary, bg: colors.surface, label: status };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const QRDisplayCard: React.FC<{ qrDataUrl: string | null; booking: Booking }> = ({
  qrDataUrl,
  booking,
}) => (
  <Card style={styles.qrCard} padding={spacing.lg}>
    <Text style={styles.qrTitle}>Mã QR Check-in</Text>
    <Text style={styles.qrSubtitle}>
      Quét mã này tại quầy để check-in nhanh
    </Text>
    <View style={styles.qrContainer}>
      {qrDataUrl ? (
        <View style={styles.qrWrapper}>
          <QRCode
            value={JSON.stringify({ bookingId: booking._id, branchId: typeof booking.branchId === 'object' ? booking.branchId._id : booking.branchId })}
            size={220}
            backgroundColor="white"
            color="#212121"
          />
        </View>
      ) : (
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrPlaceholderIcon}>📷</Text>
          <Text style={styles.qrPlaceholderText}>Đang tải mã QR...</Text>
        </View>
      )}
    </View>
    <Text style={styles.qrHint}>
      Mã QR có hiệu lực đến giờ hẹn. Vui lòng đến đúng giờ để được phục vụ.
    </Text>
  </Card>
);

const CheckInAction: React.FC<{
  booking: Booking;
  checkingIn: boolean;
  checkInSuccess: boolean;
  onCheckIn: () => void;
}> = ({ booking, checkingIn, checkInSuccess, onCheckIn }) => {
  const canCheckIn = (booking.status === 'confirmed' || booking.status === 'pending');

  if (checkInSuccess || booking.status === 'checked_in' || booking.status === 'in_progress') {
    return (
      <Card style={styles.successCard} padding={spacing.lg}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Check-in thành công!</Text>
        <Text style={styles.successSubtitle}>
          Bạn đã check-in thành công. Vui lòng đợi nhân viên gọi tên xe.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.actionContainer}>
      <Button
        title={checkingIn ? 'Đang check-in...' : 'Xác nhận Check-in tại quầy'}
        onPress={onCheckIn}
        disabled={!canCheckIn || checkingIn}
        loading={checkingIn}
        style={styles.checkInButton}
      />
      {!canCheckIn && (
        <Text style={styles.cannotCheckInText}>
          Booking này không thể check-in (trạng thái: {booking.status})
        </Text>
      )}
    </View>
  );
};

const NoBookingCard: React.FC<{ onSelectMode: () => void }> = ({ onSelectMode }) => (
  <Card style={styles.noBookingCard} padding={spacing.xl}>
    <Text style={styles.noBookingIcon}>📋</Text>
    <Text style={styles.noBookingTitle}>Chưa chọn lịch hẹn</Text>
    <Text style={styles.noBookingText}>
      Bạn có thể quét mã QR hoặc nhập mã booking để check-in.
    </Text>
    <TouchableOpacity style={styles.selectButton} onPress={onSelectMode}>
      <Text style={styles.selectButtonText}>Chọn cách nhập thông tin</Text>
    </TouchableOpacity>
  </Card>
);

// ─── Scan Mode ───────────────────────────────────────────────────────────────

const ScanModeContent: React.FC<{ onScanned: (data: string) => void }> = ({ onScanned }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await require('expo-camera').Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  }, [scanned, onScanned]);

  return (
    <Card style={styles.scanCard} padding={spacing.lg}>
      <Text style={styles.scanTitle}>Quét mã QR</Text>
      <Text style={styles.scanSubtitle}>
        Quét mã QR trên booking để check-in nhanh tại quầy
      </Text>

      {hasPermission === null ? (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderIcon}>⏳</Text>
          <Text style={styles.cameraPlaceholderText}>Đang yêu cầu quyền camera...</Text>
        </View>
      ) : hasPermission === false ? (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderIcon}>🚫</Text>
          <Text style={styles.cameraPlaceholderText}>Không có quyền camera</Text>
          <Text style={styles.cameraPlaceholderSubtext}>
            Vui lòng cấp quyền camera trong Cài đặt thiết bị
          </Text>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.scanHint}>
                {scanned ? 'Đã quét! Đang xử lý...' : 'Đưa mã QR vào khung để quét'}
              </Text>
            </View>
          </CameraView>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanText}>🔄 Quét lại</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Fallback manual input */}
      <Text style={[styles.scanNote, { marginTop: spacing.md }]}>
        Hoặc nhập mã booking thủ công:
      </Text>
      <TextInput
        style={styles.codeInput}
        placeholder="Nhập mã booking (ObjectId 24 ký tự)"
        placeholderTextColor={colors.textTertiary}
        value={manualCode}
        onChangeText={setManualCode}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
      />
      <Button
        title="Check-in với mã này"
        onPress={() => {
          if (manualCode.trim().length === 24) {
            onScanned(JSON.stringify({ bookingId: manualCode.trim() }));
          } else {
            Alert.alert('Mã không hợp lệ', 'Vui lòng nhập mã booking gồm 24 ký tự.');
          }
        }}
        disabled={manualCode.trim().length !== 24}
        style={styles.scanButton}
      />
      <Text style={styles.scanNote}>
        Mã booking là chuỗi ObjectId 24 ký tự (hex), có thể tìm trong lịch sử đặt lịch.
      </Text>
    </Card>
  );
};

// ─── Manual Entry Mode ──

const ManualEntryContent: React.FC<{ onFound: (bookingId: string) => void }> = ({
  onFound,
}) => {
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!code.trim()) return;
    setSearching(true);
    try {
      const apiClient = (await import('../../src/api/client')).apiClient;
      await apiClient.get(`/bookings/${code.trim()}`);
      onFound(code.trim());
    } catch (err: any) {
      Alert.alert(
        'Không tìm thấy',
        err?.response?.data?.message || 'Không tìm thấy booking với mã này.'
      );
    } finally {
      setSearching(false);
    }
  }, [code, onFound]);

  return (
    <Card style={styles.manualCard} padding={spacing.lg}>
      <Text style={styles.manualTitle}>Nhập mã Booking</Text>
      <Text style={styles.manualSubtitle}>
        Nhập mã booking (ObjectId 24 ký tự) để xem thông tin và check-in
      </Text>
      <TextInput
        style={styles.codeInput}
        placeholder="VD: 60d5ec49f1b2c8b3a4e7f123"
        placeholderTextColor={colors.textTertiary}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
      />
      <Button
        title={searching ? 'Đang tìm...' : 'Tìm Booking'}
        onPress={handleSearch}
        disabled={code.trim().length !== 24 || searching}
        loading={searching}
        style={styles.manualButton}
      />
      <Text style={styles.manualNote}>
        💡 Tìm mã booking trong mục Lịch sử đặt lịch, chi tiết booking, hoặc email xác nhận.
      </Text>
    </Card>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    ...shadows.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: colors.textInverse,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textInverse,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  modeIcon: {
    fontSize: 20,
  },
  modeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modeLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRowIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    width: 20,
    textAlign: 'center',
  },
  infoRowLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    width: 80,
  },
  infoRowValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  qrCard: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  qrTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  qrSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  qrWrapper: {
    padding: spacing.sm,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  qrPlaceholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  qrPlaceholderText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  qrHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actionContainer: {
    marginBottom: spacing.lg,
  },
  checkInButton: {
    backgroundColor: colors.success,
  },
  cannotCheckInText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: spacing.md,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successIconText: {
    fontSize: 28,
    color: colors.textInverse,
    fontWeight: '700',
  },
  successTitle: {
    ...typography.h3,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noBookingCard: {
    alignItems: 'center',
  },
  noBookingIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  noBookingTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noBookingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  selectButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  scanCard: {
    alignItems: 'center',
  },
  scanTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  scanSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cameraPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  cameraPlaceholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  cameraPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cameraPlaceholderSubtext: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  codeInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  scanButton: {
    width: '100%',
  },
  scanNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  manualCard: {
    alignItems: 'center',
  },
  manualTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  manualSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  manualButton: {
    width: '100%',
  },
  manualNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  cameraContainer: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  camera: {
    width: '100%',
    height: 260,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanHint: {
    ...typography.bodySmall,
    color: colors.textInverse,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  rescanButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rescanText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});

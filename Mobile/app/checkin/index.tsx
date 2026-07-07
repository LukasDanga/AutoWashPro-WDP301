/**
 * AutoWashPro QR Check-in Screen
 * View booking QR code for staff scanning
 * Following UX guidelines: accessibility, no-emoji-icons, scale-feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { bookingApi } from '../../src/api/booking';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Card,
  Loading,
  Button,
  Icon,
  Icons,
  PressableScale,
  Text as AppText,
  Badge,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { colors as staticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Booking } from '../../src/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type Mode = 'view' | 'scan' | 'manual';

const STATUS_MAP: Record<string, { variant: any; label: string }> = {
  pending: { variant: 'warning', label: 'Chờ xác nhận' },
  confirmed: { variant: 'info', label: 'Đã xác nhận' },
  checked_in: { variant: 'primary', label: 'Đã check-in' },
  in_progress: { variant: 'info', label: 'Đang rửa' },
  completed: { variant: 'success', label: 'Hoàn thành' },
  cancelled: { variant: 'error', label: 'Đã hủy' },
};

export default function CheckInScreen() {
  const { id, mode: paramMode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const toast = useToast();

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
      setQrDataUrl(qrData.qrCode || (qrData as any).qrDataUrl || null);
    } catch (err: any) {
      AlertDialog.error('Lỗi', err?.response?.data?.message || 'Không thể tải thông tin booking');
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
      AlertDialog.warning(
        'Không thể check-in',
        'Booking này không ở trạng thái có thể check-in.',
      );
      return;
    }

    AlertDialog.confirm(
      'Xác nhận Check-in',
      `Bạn có chắc muốn check-in cho lịch rửa xe này?\n\nChi nhánh: ${typeof booking.branchId === 'object' ? booking.branchId.name : '—'}\nNgày: ${format(new Date(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })}\nGiờ: ${booking.startTime}`,
      async () => {
        setCheckingIn(true);
        try {
          const apiClient = (await import('../../src/api/client')).apiClient;
          await apiClient.patch(`/bookings/${booking._id}/status`, {
            status: 'checked_in',
          });
          setCheckInSuccess(true);
          toast.success('Check-in thành công', 'Vui lòng đưa mã QR cho nhân viên');
          await fetchBookingQR(booking._id);
        } catch (err: any) {
          AlertDialog.error(
            'Lỗi',
            err?.response?.data?.message || 'Không thể check-in. Vui lòng thử lại.',
          );
        } finally {
          setCheckingIn(false);
        }
      },
      undefined,
      'Check-in ngay',
      'Hủy',
    );
  }, [booking, fetchBookingQR, toast]);

  if (loading) {
    return <Loading fullScreen message="Đang tải thông tin..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
        >
          <Icon name={Icons.back} size={20} color={colors.textInverse} />
        </PressableScale>
        <Text style={styles.headerTitle}>Check-in QR</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        {[
          { key: 'view', label: 'Xem QR', icon: Icons.qrCodeOutline },
          { key: 'scan', label: 'Quét QR', icon: Icons.cameraOutline },
          { key: 'manual', label: 'Nhập mã', icon: Icons.createOutline },
        ].map((m) => (
          <PressableScale
            key={m.key}
            style={[styles.modeButton, mode === m.key && styles.modeButtonActive]}
            onPress={() => setMode(m.key as Mode)}
            accessibilityLabel={`Chế độ ${m.label}`}
          >
            <Icon
              name={m.icon}
              size={20}
              color={mode === m.key ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>
              {m.label}
            </Text>
          </PressableScale>
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
            try {
              const payload = JSON.parse(data);
              if (payload.bookingId) {
                router.push({ pathname: '/checkin', params: { id: payload.bookingId, mode: 'view' } });
                setMode('view');
              } else {
                AlertDialog.error('QR không hợp lệ', 'Mã QR không chứa thông tin booking hợp lệ.');
              }
            } catch {
              AlertDialog.error('QR không hợp lệ', 'Mã QR không đúng định dạng AutoWashPro.');
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

const BookingInfoCard: React.FC<{ booking: Booking }> = ({ booking }) => {
  const branchName = typeof booking.branchId === 'object' ? booking.branchId.name : '—';
  const pkgName = typeof booking.packageId === 'object' ? booking.packageId.name : '—';
  const vehiclePlate = typeof booking.vehicleId === 'object' ? booking.vehicleId.licensePlate : '—';

  const statusInfo = STATUS_MAP[booking.status] || { variant: 'default', label: booking.status };

  return (
    <Card style={styles.infoCard} padding="lg">
      <View style={styles.infoHeader}>
        <Text style={styles.infoTitle}>Thông tin lịch hẹn</Text>
        <Badge
          label={statusInfo.label}
          variant={statusInfo.variant}
          size="small"
          showIcon
        />
      </View>
      <View style={styles.infoGrid}>
        <InfoRow icon={Icons.locationOutline} label="Chi nhánh" value={branchName} />
        <InfoRow icon={Icons.sparkle} label="Dịch vụ" value={pkgName} />
        <InfoRow icon={Icons.carOutline} label="Biển số" value={vehiclePlate} />
        <InfoRow
          icon={Icons.calendarOutline}
          label="Ngày"
          value={format(new Date(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })}
        />
        <InfoRow icon={Icons.timeOutline} label="Giờ" value={booking.startTime} />
        <InfoRow
          icon={Icons.cardOutline}
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
    <View style={styles.infoIconContainer}>
      <Icon name={icon} size={16} color={staticColors.primary} />
    </View>
    <Text style={styles.infoRowLabel}>{label}</Text>
    <Text style={styles.infoRowValue} numberOfLines={1}>{value}</Text>
  </View>
);

const QRDisplayCard: React.FC<{ qrDataUrl: string | null; booking: Booking }> = ({
  qrDataUrl,
  booking,
}) => (
  <Card style={styles.qrCard} padding="lg">
    <AppText variant="h3" style={styles.qrTitle}>
      Mã QR Check-in
    </AppText>
    <AppText variant="bodySmall" color="textSecondary" style={styles.qrSubtitle}>
      Quét mã này tại quầy để check-in nhanh
    </AppText>
    <View style={styles.qrContainer}>
      {qrDataUrl ? (
        <View style={styles.qrWrapper}>
          <QRCode
            value={JSON.stringify({
              bookingId: booking._id,
              branchId: typeof booking.branchId === 'object' ? booking.branchId._id : booking.branchId
            })}
            size={220}
            backgroundColor="white"
            color="#212121"
          />
        </View>
      ) : (
        <View style={styles.qrPlaceholder}>
          <Icon name={Icons.cameraOutline} size={48} color={staticColors.textTertiary} />
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
      <Card style={styles.successCard} padding="lg">
        <View style={styles.successIcon}>
          <Icon name={Icons.checkmark} size={28} color={staticColors.textInverse} />
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
        icon={<Icon name={Icons.checkmark} size={20} color={staticColors.textInverse} />}
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
  <Card style={styles.noBookingCard} padding="xl">
    <Icon name={Icons.qrCodeOutline} size={48} color={staticColors.textTertiary} />
    <Text style={styles.noBookingTitle}>Chưa chọn lịch hẹn</Text>
    <Text style={styles.noBookingText}>
      Bạn có thể quét mã QR hoặc nhập mã booking để check-in.
    </Text>
    <Button
      title="Chọn cách nhập thông tin"
      onPress={onSelectMode}
      style={styles.selectButton}
    />
  </Card>
);

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
    <Card style={styles.scanCard} padding="lg">
      <Text style={styles.scanTitle}>Quét mã QR</Text>
      <Text style={styles.scanSubtitle}>
        Quét mã QR trên booking để check-in nhanh tại quầy
      </Text>

      {hasPermission === null ? (
        <View style={styles.cameraPlaceholder}>
          <Icon name={Icons.timeOutline} size={48} color={staticColors.textTertiary} />
          <Text style={styles.cameraPlaceholderText}>Đang yêu cầu quyền camera...</Text>
        </View>
      ) : hasPermission === false ? (
        <View style={styles.cameraPlaceholder}>
          <Icon name={Icons.error} size={48} color={staticColors.error} />
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
            <PressableScale
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Icon name={Icons.refreshOutline} size={16} color={staticColors.primary} />
              <Text style={styles.rescanText}>Quét lại</Text>
            </PressableScale>
          )}
        </View>
      )}

      <Text style={[styles.scanNote, { marginTop: spacing.md }]}>
        Hoặc nhập mã booking thủ công:
      </Text>
      <TextInput
        style={styles.codeInput}
        placeholder="Nhập mã booking (ObjectId 24 ký tự)"
        placeholderTextColor={staticColors.textTertiary}
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
            AlertDialog.error('Mã không hợp lệ', 'Vui lòng nhập mã booking gồm 24 ký tự.');
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
      AlertDialog.error(
        'Không tìm thấy',
        err?.response?.data?.message || 'Không tìm thấy booking với mã này.',
      );
    } finally {
      setSearching(false);
    }
  }, [code, onFound]);

  return (
    <Card style={styles.manualCard} padding="lg">
      <Text style={styles.manualTitle}>Nhập mã Booking</Text>
      <Text style={styles.manualSubtitle}>
        Nhập mã booking (ObjectId 24 ký tự) để xem thông tin và check-in
      </Text>
      <TextInput
        style={styles.codeInput}
        placeholder="VD: 60d5ec49f1b2c8b3a4e7f123"
        placeholderTextColor={staticColors.textTertiary}
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
      <View style={styles.manualNoteContainer}>
        <Icon name={Icons.info} size={14} color={staticColors.textTertiary} />
        <Text style={styles.manualNote}>
          Tìm mã booking trong mục Lịch sử đặt lịch, chi tiết booking, hoặc email xác nhận.
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2563EB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    ...shadows.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: '#FFFFFF',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    gap: spacing.xs,
    minHeight: 44,
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  modeLabel: {
    ...typography.caption,
    color: '#475569',
    fontWeight: '500',
  },
  modeLabelActive: {
    color: '#2563EB',
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
    color: '#0F172A',
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoRowLabel: {
    ...typography.bodySmall,
    color: '#475569',
    width: 90,
  },
  infoRowValue: {
    ...typography.bodySmall,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  qrCard: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  qrTitle: {
    marginBottom: spacing.xs,
  },
  qrSubtitle: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  qrPlaceholderText: {
    ...typography.bodySmall,
    color: '#94A3B8',
  },
  qrHint: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actionContainer: {
    marginBottom: spacing.lg,
  },
  checkInButton: {
    backgroundColor: '#16A34A',
  },
  cannotCheckInText: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#16A34A',
    marginBottom: spacing.md,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h3,
    color: '#16A34A',
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.body,
    color: '#475569',
    textAlign: 'center',
  },
  noBookingCard: {
    alignItems: 'center',
  },
  noBookingTitle: {
    ...typography.h3,
    color: '#0F172A',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  noBookingText: {
    ...typography.body,
    color: '#475569',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  selectButton: {
    minWidth: 200,
  },
  scanCard: {
    alignItems: 'center',
  },
  scanTitle: {
    ...typography.h3,
    color: '#0F172A',
    marginBottom: spacing.xs,
  },
  scanSubtitle: {
    ...typography.bodySmall,
    color: '#475569',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cameraPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  cameraPlaceholderText: {
    ...typography.body,
    color: '#475569',
  },
  cameraPlaceholderSubtext: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: '#0F172A',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
    minHeight: 48,
  },
  scanButton: {
    width: '100%',
  },
  scanNote: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  manualCard: {
    alignItems: 'center',
  },
  manualTitle: {
    ...typography.h3,
    color: '#0F172A',
    marginBottom: spacing.xs,
  },
  manualSubtitle: {
    ...typography.bodySmall,
    color: '#475569',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  manualButton: {
    width: '100%',
  },
  manualNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  manualNote: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'left',
    flex: 1,
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
    borderColor: '#2563EB',
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
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  rescanText: {
    ...typography.bodySmall,
    color: '#2563EB',
    fontWeight: '600',
  },
});

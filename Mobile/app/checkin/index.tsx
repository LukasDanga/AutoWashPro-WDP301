/**
 * AutoWashPro QR Check-in Screen — Polished UI Refactor
 * All business logic preserved. Only layout, spacing, typography,
 * segmented control, and visual polish improved.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'view' | 'scan' | 'manual';

const STATUS_MAP: Record<string, { variant: any; label: string }> = {
  pending:    { variant: 'warning', label: 'Chờ xác nhận' },
  confirmed:  { variant: 'info',    label: 'Đã xác nhận' },
  checked_in: { variant: 'primary', label: 'Đã check-in' },
  in_progress:{ variant: 'info',    label: 'Đang rửa' },
  completed:  { variant: 'success', label: 'Hoàn thành' },
  cancelled:  { variant: 'error',   label: 'Đã hủy' },
};

const TABS: { key: Mode; label: string; icon: string; iconActive: string }[] = [
  { key: 'view',   label: 'Xem QR',  icon: Icons.qrCodeOutline, iconActive: Icons.qrCode },
  { key: 'scan',   label: 'Quét QR', icon: Icons.cameraOutline, iconActive: Icons.camera },
  { key: 'manual', label: 'Nhập mã', icon: Icons.createOutline, iconActive: Icons.create },
];

// ─── SegmentedControl ─────────────────────────────────────────────────────────
const SegmentedControl: React.FC<{
  value: Mode;
  onChange: (v: Mode) => void;
}> = ({ value, onChange }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = useState(0);
  const activeIndex = TABS.findIndex((t) => t.key === value);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / TABS.length;
    setTabWidth(w);
    slideAnim.setValue(activeIndex * w);
  };

  const handlePress = (key: Mode) => {
    const idx = TABS.findIndex((t) => t.key === key);
    Animated.spring(slideAnim, {
      toValue: idx * tabWidth,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
    onChange(key);
  };

  return (
    <View style={seg.track} onLayout={onLayout}>
      {/* Sliding pill */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            seg.pill,
            { width: tabWidth, transform: [{ translateX: slideAnim }] },
          ]}
        />
      )}

      {/* Tabs */}
      {TABS.map((tab) => {
        const isActive = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={seg.tab}
            onPress={() => handlePress(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              name={isActive ? tab.iconActive : tab.icon}
              size={18}
              color={isActive ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[seg.label, isActive && seg.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const seg = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 28,
    height: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 22,
    backgroundColor: '#10B981',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
      setQrDataUrl(qrData.qrDataUrl || null);
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
      AlertDialog.warning('Không thể check-in', 'Booking này không ở trạng thái có thể check-in.');
      return;
    }

    AlertDialog.confirm(
      'Xác nhận Check-in',
      `Bạn có chắc muốn check-in cho lịch rửa xe này?\n\nChi nhánh: ${typeof booking.branchId === 'object' ? booking.branchId.name : '—'}\nNgày: ${format(new Date(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })}\nGiờ: ${booking.startTime}`,
      async () => {
        setCheckingIn(true);
        try {
          const apiClient = (await import('../../src/api/client')).apiClient;
          await apiClient.patch(`/bookings/${booking._id}/status`, { status: 'checked_in' });
          setCheckInSuccess(true);
          toast.success('Check-in thành công', 'Vui lòng đưa mã QR cho nhân viên');
          await fetchBookingQR(booking._id);
        } catch (err: any) {
          AlertDialog.error('Lỗi', err?.response?.data?.message || 'Không thể check-in. Vui lòng thử lại.');
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
      {/* ── Header ── */}
      <View style={styles.header}>
        <PressableScale
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
        >
          <Icon name={Icons.back} size={20} color="#FFFFFF" />
        </PressableScale>
        <Text style={styles.headerTitle}>QR Check-in</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Segmented Control ── */}
      <View style={styles.segmentedWrapper}>
        <SegmentedControl value={mode} onChange={setMode} />
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

// ─── BookingInfoCard ──────────────────────────────────────────────────────────
const BookingInfoCard: React.FC<{ booking: Booking }> = ({ booking }) => {
  const branchName   = typeof booking.branchId === 'object' ? booking.branchId.name : '—';
  const pkgName      = typeof booking.packageId === 'object' ? booking.packageId.name : '—';
  const vehiclePlate = typeof booking.vehicleId === 'object' ? booking.vehicleId.licensePlate : '—';
  const statusInfo   = STATUS_MAP[booking.status] || { variant: 'default', label: booking.status };

  return (
    <Card style={styles.infoCard} padding="lg">
      <View style={styles.infoHeader}>
        <Text style={styles.infoTitle}>Thông tin lịch hẹn</Text>
        <Badge label={statusInfo.label} variant={statusInfo.variant} size="small" showIcon />
      </View>
      <View style={styles.infoGrid}>
        <InfoRow icon={Icons.locationOutline} label="Chi nhánh" value={branchName} />
        <InfoRow icon={Icons.sparkle}         label="Dịch vụ"  value={pkgName} />
        <InfoRow icon={Icons.carOutline}       label="Biển số"  value={vehiclePlate} />
        <InfoRow icon={Icons.calendarOutline}  label="Ngày"     value={format(new Date(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })} />
        <InfoRow icon={Icons.timeOutline}      label="Giờ"      value={booking.startTime} />
        <InfoRow icon={Icons.cardOutline}      label="Thanh toán" value={booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'} />
      </View>
    </Card>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconContainer}>
      <Icon name={icon} size={16} color={staticColors.primary} />
    </View>
    <Text style={styles.infoRowLabel}>{label}</Text>
    <Text style={styles.infoRowValue} numberOfLines={1}>{value}</Text>
  </View>
);

// ─── QRDisplayCard ────────────────────────────────────────────────────────────
const QRDisplayCard: React.FC<{ qrDataUrl: string | null; booking: Booking }> = ({ qrDataUrl, booking }) => (
  <Card style={styles.qrCard} padding="lg">
    <AppText variant="h3" style={styles.qrTitle}>Mã QR Check-in</AppText>
    <AppText variant="bodySmall" color="textSecondary" style={styles.qrSubtitle}>
      Quét mã này tại quầy để check-in nhanh
    </AppText>
    <View style={styles.qrContainer}>
      {qrDataUrl ? (
        <View style={styles.qrWrapper}>
          <QRCode
            value={JSON.stringify({
              bookingId: booking._id,
              branchId: typeof booking.branchId === 'object' ? booking.branchId._id : booking.branchId,
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

// ─── CheckInAction ────────────────────────────────────────────────────────────
const CheckInAction: React.FC<{
  booking: Booking;
  checkingIn: boolean;
  checkInSuccess: boolean;
  onCheckIn: () => void;
}> = ({ booking, checkingIn, checkInSuccess, onCheckIn }) => {
  const canCheckIn = booking.status === 'confirmed' || booking.status === 'pending';

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

// ─── NoBookingCard ────────────────────────────────────────────────────────────
const NoBookingCard: React.FC<{ onSelectMode: () => void }> = ({ onSelectMode }) => (
  <Card style={styles.noBookingCard} padding="xl">
    {/* QR icon in light-blue circle */}
    <View style={styles.noBookingIconBg}>
      <Icon name={Icons.qrCodeOutline} size={40} color="#10B981" />
    </View>

    <Text style={styles.noBookingTitle}>Chưa chọn lịch hẹn</Text>
    <Text style={styles.noBookingText}>
      Bạn có thể quét mã QR hoặc nhập mã booking để check-in.
    </Text>
    <Button
      title="Nhập mã Booking"
      onPress={onSelectMode}
      style={styles.selectButton}
    />
  </Card>
);

// ─── ScanModeContent ──────────────────────────────────────────────────────────
const ScanModeContent: React.FC<{ onScanned: (data: string) => void }> = ({ onScanned }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

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

      {!permission ? (
        <View style={styles.cameraPlaceholder}>
          <Icon name={Icons.timeOutline} size={48} color={staticColors.textTertiary} />
          <Text style={styles.cameraPlaceholderText}>Đang yêu cầu quyền camera...</Text>
        </View>
      ) : !permission.granted ? (
        <View style={styles.cameraPlaceholder}>
          <Icon name={Icons.error} size={48} color={staticColors.error} />
          <Text style={styles.cameraPlaceholderText}>Không có quyền camera</Text>
          <Text style={styles.cameraPlaceholderSubtext}>
            Vui lòng cấp quyền camera trong Cài đặt thiết bị
          </Text>
          <Button
            title="Cấp quyền camera"
            onPress={requestPermission}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
            <PressableScale style={styles.rescanButton} onPress={() => setScanned(false)}>
              <Icon name={Icons.refreshOutline} size={16} color={staticColors.primary} />
              <Text style={styles.rescanText}>Quét lại</Text>
            </PressableScale>
          )}
        </View>
      )}

      <Text style={styles.scanNote}>Hoặc nhập mã booking thủ công:</Text>
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
      <Text style={styles.scanNoteBottom}>
        Mã booking là chuỗi ObjectId 24 ký tự (hex), có thể tìm trong lịch sử đặt lịch.
      </Text>
    </Card>
  );
};

// ─── ManualEntryContent ───────────────────────────────────────────────────────
// Accepts either:
//   • A 24-char ObjectId of a Booking  → GET /bookings/:id
//   • A Slot Pack code (e.g. SP-XXXX) → GET /slot-packs?packCode=XXXX
const ManualEntryContent: React.FC<{ onFound: (bookingId: string) => void }> = ({ onFound }) => {
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);

  const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
  const PACK_CODE_RE = /^[A-Z]{2,4}-[A-Z0-9]{4,12}$/i;

  const handleSearch = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSearching(true);
    try {
      const { apiClient } = await import('../../src/api/client');
      const { slotPackApi } = await import('../../src/api');

      if (OBJECT_ID_RE.test(trimmed)) {
        // Treat as a Booking ObjectId
        await apiClient.get(`/bookings/${trimmed}`);
        onFound(trimmed);
        return;
      }

      if (PACK_CODE_RE.test(trimmed)) {
        // Treat as a Slot Pack code — pick the first active pack with that code.
        const packs = await slotPackApi.getMySlotPacks();
        const match = (packs || []).find(
          (p) => p.packCode?.toUpperCase() === trimmed.toUpperCase() && p.status === 'active',
        );
        if (!match) {
          AlertDialog.error('Không tìm thấy', 'Không tìm thấy gói slot hợp lệ với mã này.');
          return;
        }
        // Pack consumption creates its own booking on the server; nudge the
        // user back to the slot-pack flow rather than the booking detail.
        AlertDialog.show({
          title: 'Gói slot hợp lệ',
          message: `Mã gói "${match.packCode}" còn ${match.remainingSlots}/${match.totalSlots} lượt. Vui lòng dùng nút "Đặt lịch dùng gói" trong trang Slot Packs.`,
          variant: 'info',
          actions: [{ text: 'Đóng', onPress: () => {} }],
        });
        return;
      }

      AlertDialog.error(
        'Mã không hợp lệ',
        'Vui lòng nhập mã booking (24 ký tự hex) hoặc mã gói slot (ví dụ: SP-XXXX).',
      );
    } catch (err: any) {
      AlertDialog.error('Không tìm thấy', err?.response?.data?.message || 'Không tìm thấy booking với mã này.');
    } finally {
      setSearching(false);
    }
  }, [code, onFound]);

  const trimmed = code.trim();
  const isValid = OBJECT_ID_RE.test(trimmed) || PACK_CODE_RE.test(trimmed);

  return (
    <Card style={styles.manualCard} padding="lg">
      <Text style={styles.manualTitle}>Nhập mã Booking hoặc mã gói Slot</Text>
      <Text style={styles.manualSubtitle}>
        Nhập mã booking 24 ký tự hoặc mã gói slot (ví dụ SP-A1B2C3)
      </Text>
      <TextInput
        style={styles.codeInput}
        placeholder="Booking: 60d5ec49f1b2c8b3a4e7f123   |   Pack: SP-A1B2C3"
        placeholderTextColor={staticColors.textTertiary}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={32}
      />
      <Button
        title={searching ? 'Đang tìm...' : 'Tìm'}
        onPress={handleSearch}
        disabled={!isValid || searching}
        loading={searching}
        style={styles.manualButton}
      />
      <View style={styles.manualNoteContainer}>
        <Icon name={Icons.info} size={14} color={staticColors.textTertiary} />
        <Text style={styles.manualNote}>
          Mã booking có trong Lịch sử đặt lịch / email xác nhận. Mã gói slot có trong mục Slot Packs của tài khoản.
        </Text>
      </View>
    </Card>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 44,
  },

  // ── Segmented control wrapper ────────────────────────────────────────────────
  segmentedWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // ── Scroll content ───────────────────────────────────────────────────────────
  content: {
    padding: 16,
    paddingBottom: 48,
  },

  // ── Booking info card ────────────────────────────────────────────────────────
  infoCard: {
    marginBottom: 16,
    borderRadius: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  infoIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoRowLabel: {
    fontSize: 14,
    color: '#64748B',
    width: 92,
    fontWeight: '400',
  },
  infoRowValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },

  // ── QR card ─────────────────────────────────────────────────────────────────
  qrCard: {
    marginBottom: 16,
    alignItems: 'center',
    borderRadius: 20,
  },
  qrTitle: {
    marginBottom: 6,
    textAlign: 'center',
  },
  qrSubtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  qrWrapper: {
    padding: 8,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 12,
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  qrHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },

  // ── Check-in action ──────────────────────────────────────────────────────────
  actionContainer: {
    marginBottom: 24,
  },
  checkInButton: {
    backgroundColor: '#16A34A',
    height: 52,
    borderRadius: 26,
  },
  cannotCheckInText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },

  // ── Success card ─────────────────────────────────────────────────────────────
  successCard: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 16,
    borderRadius: 20,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#15803D',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── No booking card ──────────────────────────────────────────────────────────
  noBookingCard: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 32,
  },
  noBookingIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noBookingTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  noBookingText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  selectButton: {
    minWidth: 200,
    height: 52,
    borderRadius: 26,
  },

  // ── Scan card ────────────────────────────────────────────────────────────────
  scanCard: {
    alignItems: 'center',
    borderRadius: 20,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  cameraPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 12,
  },
  cameraPlaceholderText: {
    fontSize: 15,
    color: '#475569',
  },
  cameraPlaceholderSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  cameraContainer: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#000000',
  },
  camera: {
    width: '100%',
    height: 280,
    borderRadius: 16,
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
    borderColor: '#10B981',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanHint: {
    fontSize: 13,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
    overflow: 'hidden',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  rescanText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: 0.5,
    minHeight: 52,
  },
  scanButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
  },
  scanNote: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  scanNoteBottom: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },

  // ── Manual entry card ────────────────────────────────────────────────────────
  manualCard: {
    alignItems: 'center',
    borderRadius: 20,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  manualSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  manualButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
  },
  manualNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 8,
  },
  manualNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'left',
    flex: 1,
    lineHeight: 18,
  },
});

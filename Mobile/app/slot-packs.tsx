import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Modal,
  ScrollView,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { slotPackApi, branchApi, packageApi, vehicleApi } from '../src/api';
import {
  Card,
  Loading,
  EmptyState,
  Button,
  Text as AppText,
  Icon,
  Icons,
  Header,
  ScreenContainer,
  AlertDialog,
  useToast,
  PressableScale,
  SegmentedControl,
  BottomSheet,
} from '../src/components/common';
import { useColors } from '../src/theme/ThemeContext';
import { spacing, borderRadius, layout, shadows } from '../src/theme/spacing';
import { formatCurrency } from '../src/utils';
import type { SlotPack, Branch, Package, Vehicle } from '../src/types';
import { consumePendingVoucher } from '../src/utils/voucherStore';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCOUNT_TIERS = [
  { min: 1, max: 4, pct: 0, label: 'Giá gốc' },
  { min: 5, max: 9, pct: 5, label: 'Tiết kiệm 5%' },
  { min: 10, max: 19, pct: 10, label: 'Tiết kiệm 10%' },
  { min: 20, max: 50, pct: 15, label: 'Tiết kiệm 15%' },
];

function getDiscountPct(n: number) { return DISCOUNT_TIERS.find(t => n >= t.min && t.max ? n <= t.max : true)?.pct || 0; }
function getDiscountLabel(n: number) { return DISCOUNT_TIERS.find(t => n >= t.min && t.max ? n <= t.max : true)?.label || ''; }

export default function SlotPacksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [slotPacks, setSlotPacks] = useState<SlotPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'active' | 'history'>('active');

  // Buy Flow State
  const [isBuying, setIsBuying] = useState(false);
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // Tracks how many active packages each branch has — used to disable branches
  // with no packages in the step-1 picker.
  const [branchPackageCounts, setBranchPackageCounts] = useState<Record<string, number>>({});
  
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [slotCount, setSlotCount] = useState<number>(5);
  const [appliedVoucher, setAppliedVoucher] = useState<{code: string; name: string; discount: number} | null>(null);
  
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'vnpay'>('vnpay');
  const [resumingPackId, setResumingPackId] = useState<string | null>(null);

  // Bank-transfer QR modal — populated after `paySlotPack('bank')`.
  // We poll the SlotPack status until it flips to "active" (i.e. the bank
  // webhook confirmed the Payment). Without this poll the screen used to
  // claim "Đã tạo gói slot. Vui lòng thanh toán." and never recovered.
  const [showQrModal, setShowQrModal] = useState(false);
  const [pendingPaymentPackId, setPendingPaymentPackId] = useState<string | null>(null);
  const [pendingPaymentQr, setPendingPaymentQr] = useState<string | null>(null);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [qrCountdown, setQrCountdown] = useState<number>(600);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSlotPacks = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await slotPackApi.getMySlotPacks();
      // apiClient interceptor unwraps { success, data } → returns array directly,
      // but defensively handle both shapes in case a future server response changes.
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];
      setSlotPacks(list);
    } catch (error) {
      console.error('Error fetching slot packs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  const filteredPacks = useMemo(() => {
    return slotPacks.filter((pack) => {
      const isActive = pack.status === 'active' && pack.remainingSlots > 0;
      if (filterTab === 'active') return isActive;
      return !isActive;
    });
  }, [slotPacks, filterTab]);

  useEffect(() => {
    fetchSlotPacks();
  }, [fetchSlotPacks]);

  // Refetch on screen focus so a pack bought from elsewhere (deep link,
  // promotion tab, etc.) appears without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) fetchSlotPacks();
    }, [isAuthenticated, fetchSlotPacks])
  );

  useFocusEffect(
    useCallback(() => {
      if (isBuying && step === 4) {
        // voucherStore only exports consumePendingVoucher (read + clear).
        // Older names getPendingVoucher/clearPendingVoucher do not exist.
        const voucher = consumePendingVoucher();
        if (voucher) {
          setAppliedVoucher(voucher);
        }
      }
    }, [isBuying, step])
  );

  useEffect(() => {
    if (params.resumePackId && slotPacks.length > 0) {
      const packToResume = slotPacks.find(p => p._id === params.resumePackId);
      if (packToResume && packToResume.status === 'pending') {
        handleResumePayment(packToResume);
        router.setParams({ resumePackId: undefined });
      }
    }
  }, [params.resumePackId, slotPacks]);

  useEffect(() => {
    if (isBuying && step === 1 && branches.length === 0) {
      Promise.all([
        branchApi.getBranches(),
        // Pre-fetch package counts for all branches so we can badge disabled
        // state in the step-1 picker without a second round-trip.
        packageApi.getPackages({ status: 'active', limit: 'all' }),
      ]).then(([branchData, allPackages]) => {
        setBranches(branchData);
        // Build a map: branchId → active package count.
        const counts: Record<string, number> = {};
        for (const pkg of allPackages) {
          const bid = (pkg as any).branchId?._id || (pkg as any).branchId;
          if (bid) counts[String(bid)] = (counts[String(bid)] || 0) + 1;
        }
        setBranchPackageCounts(counts);
      }).catch(console.error);
    }
  }, [isBuying, step]);

  useEffect(() => {
    if (isBuying && step === 2) {
      if (selectedBranch && selectedBranch !== 'ALL') {
        packageApi.getPackages({ branchId: selectedBranch, status: 'active' }).then(data => {
          setPackages(data);
          if (data.length > 0 && !data.find(p => p._id === selectedPackage)) {
            setSelectedPackage(data[0]._id);
          }
        }).catch(console.error);
      } else {
        packageApi.getPackages({ status: 'active' }).then(data => setPackages(data)).catch(console.error);
      }
      if (vehicles.length === 0) {
        vehicleApi.getVehicles().then(data => {
          setVehicles(data);
          if (data.length > 0 && !selectedVehicle) setSelectedVehicle(data[0]._id);
        }).catch(console.error);
      }
    }
  }, [isBuying, step, selectedBranch]);

  const handleCancel = (slotPack: SlotPack) => {
    AlertDialog.confirm(
      'Hủy gói slot',
      'Bạn có chắc chắn muốn hủy gói slot này không? Hành động này không thể hoàn tác.',
      async () => {
        setCancellingId(slotPack._id);
        try {
          await slotPackApi.cancelSlotPack(slotPack._id);
          AsyncStorage.removeItem('aw_slot_pending').catch(() => {});
          toast.success('Đã hủy gói slot', 'Gói slot của bạn đã được hủy');
          fetchSlotPacks();
        } catch (error: any) {
          AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể hủy gói slot');
        } finally {
          setCancellingId(null);
        }
      },
      undefined,
      'Hủy gói slot',
      'Không'
    );
  };

  const handleQuickBook = (item: SlotPack) => {
    const branchId = typeof item.branchId === 'object' ? (item.branchId as any)._id : item.branchId;
    const packageId = typeof item.packageId === 'object' ? (item.packageId as any)._id : item.packageId;
    const vehicleId = typeof item.vehicleId === 'object' ? (item.vehicleId as any)._id : item.vehicleId;
    router.push({
      pathname: '/booking',
      params: {
        branchId,
        packageId,
        vehicleId,
        quickBook: 'true',
        quickBookSlotPackId: item._id,
      },
    } as any);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: colors.successLight, text: colors.success };
      case 'exhausted': return { bg: colors.surfaceDark, text: colors.textSecondary };
      case 'expired': return { bg: colors.errorLight, text: colors.error };
      case 'cancelled': return { bg: colors.warningLight, text: colors.warning };
      case 'pending': return { bg: colors.warningLight, text: colors.warning };
      default: return { bg: colors.surface, text: colors.textSecondary };
    }
  };

  // Poll the SlotPack every 5s while the QR modal is open.
  // When the pack flips to "active", the bank webhook has confirmed the
  // payment and we close the modal automatically.
  useEffect(() => {
    if (!showQrModal || !pendingPaymentPackId) return;

    let cancelled = false;
    setIsPollingPayment(true);
    setQrCountdown(600);

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await slotPackApi.getMySlotPacks();
        if (cancelled) return;
        const updated = (data || []).find((p) => p._id === pendingPaymentPackId);
        if (updated && updated.paymentStatus === 'paid') {
          setSlotPacks(data || []);
          setShowQrModal(false);
          setPendingPaymentPackId(null);
          setPendingPaymentQr(null);
          setIsPollingPayment(false);
          AsyncStorage.removeItem('aw_slot_pending').catch(() => {});
          toast.success('Thanh toán thành công', 'Gói slot đã được kích hoạt.');
          return;
        }
      } catch (e) {
        console.warn('poll slot pack failed', e);
      }
      pollTimerRef.current = setTimeout(poll, 5000);
    };

    poll();

    const countdownInterval = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          if (!cancelled) {
            setShowQrModal(false);
            setPendingPaymentPackId(null);
            setPendingPaymentQr(null);
            setIsPollingPayment(false);
            toast.error('Hết thời gian chờ', 'Đã quá hạn thời gian quét mã thanh toán.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      setIsPollingPayment(false);
      clearInterval(countdownInterval);
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [showQrModal, pendingPaymentPackId]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { active: 'Đang hoạt động', exhausted: 'Đã dùng hết', expired: 'Đã hết hạn', cancelled: 'Đã hủy', pending: 'Chờ thanh toán' };
    return labels[status] || status;
  };

  const startBuying = () => {
    setResumingPackId(null);
    setSelectedBranch('');
    setSelectedVehicle('');
    setSelectedPackage('');
    setSlotCount(5);
    setStep(1);
    setAppliedVoucher(null);
    setBuyError('');
    setIsBuying(true);
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSlotPacks();
  }, [fetchSlotPacks]);

  // Extract the package label from a slot-pack row so the user understands
  // the 1-package-per-pack constraint (BE stores a single packageId, not an
  // array). Mobile UX must make this explicit.
  const getPackPackageLabel = (pack: SlotPack): string => {
    if (pack.packageId && typeof pack.packageId === 'object') {
      return (pack.packageId as any).name || 'Gói dịch vụ';
    }
    return 'Gói dịch vụ';
  };

  const getPackBranchLabel = (pack: SlotPack): string => {
    if (pack.branchId && typeof pack.branchId === 'object') {
      return (pack.branchId as any).name || '';
    }
    return '';
  };

  const handleBuy = async () => {
    if (!resumingPackId && (!selectedBranch || !selectedVehicle || !selectedPackage)) {
      setBuyError('Vui lòng chọn đủ chi nhánh, xe và gói dịch vụ.');
      return;
    }
    setBuyLoading(true);
    setBuyError('');
    try {
      let packId = resumingPackId;
      if (!packId) {
        const pack = await slotPackApi.buySlotPack({
          branchId: selectedBranch !== 'ALL' ? selectedBranch : undefined,
          vehicleId: selectedVehicle !== 'ALL' ? selectedVehicle : undefined,
          packageId: selectedPackage,
          totalSlots: slotCount,
          voucherCode: appliedVoucher?.code,
        } as any);
        packId = pack._id;
        // Save pending slot pack draft for home screen
        await AsyncStorage.setItem('aw_slot_pending', packId);
      }

      const payResult = await slotPackApi.paySlotPack(packId, paymentMethod);
      if (paymentMethod === 'vnpay') {
        if (payResult.paymentUrl) {
          await Linking.openURL(payResult.paymentUrl);
        }
        setIsBuying(false);
        setResumingPackId(null);
        fetchSlotPacks();
        toast.success('Vui lòng hoàn tất thanh toán trên VNPay');
        return;
      }

      // Bank transfer — backend returns a QR + bank info in the Payment doc.
      // We MUST NOT mark the pack as paid until the bank webhook flips the
      // Payment.status to "completed". Otherwise the slot pack becomes
      // "active" before money lands.
      const qrCode = payResult?.payment?.qrCode || payResult?.qrCode;
      if (!qrCode) {
        // Fallback when QR isn't available — show bank instructions only.
        setIsBuying(false);
        fetchSlotPacks();
        AlertDialog.show({
          title: 'Đã tạo gói slot',
          message: 'Vui lòng hoàn tất chuyển khoản theo thông tin ngân hàng. Gói sẽ được kích hoạt sau khi hệ thống xác nhận thanh toán.',
          variant: 'info',
          actions: [{ text: 'Đóng', onPress: () => {} }],
        });
        return;
      }

      setPendingPaymentPackId(packId);
      setPendingPaymentQr(qrCode);
      setIsBuying(false);
      setResumingPackId(null);
      setShowQrModal(true);
    } catch (err: any) {
      // BE returns { success, message, errors: [{ field, message }] } on validation.
      const resData = err.response?.data;
      let errorMsg = resData?.message || err.message || 'Lỗi mua gói slot';
      if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
        // Map field-level errors to Vietnamese labels
        const fieldLabels: Record<string, string> = {
          branchId: 'Chi nhánh',
          packageId: 'Gói dịch vụ',
          vehicleId: 'Xe',
          totalSlots: 'Số lượt',
          voucherCode: 'Mã voucher',
        };
        const details = resData.errors
          .map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`)
          .join(', ');
        errorMsg = `${errorMsg} — ${details}`;
      }
      setBuyError(errorMsg);
    } finally {
      setBuyLoading(false);
    }
  };

  const handleResumePayment = (pack: SlotPack) => {
    const b = pack.branchId && typeof pack.branchId === 'object' ? (pack.branchId as any) : null;
    const v = pack.vehicleId && typeof pack.vehicleId === 'object' ? (pack.vehicleId as any) : null;
    const p = pack.packageId && typeof pack.packageId === 'object' ? (pack.packageId as any) : null;

    if (b) setBranches([b]);
    if (v) setVehicles([v]);
    if (p) setPackages([p]);

    setSelectedBranch(b ? b._id : 'ALL');
    setSelectedVehicle(v ? v._id : 'ALL');
    setSelectedPackage(p ? p._id : '');
    setSlotCount(pack.totalSlots);
    setResumingPackId(pack._id);
    setStep(4);
    setIsBuying(true);
  };



  const renderSlotPack = ({ item }: { item: SlotPack }) => {
    const effectiveStatus = item.paymentStatus === 'unpaid' ? 'pending' : item.status;
    const statusStyle = getStatusColor(effectiveStatus);
    const isCancelling = cancellingId === item._id;

    return (
      <Card style={[styles.slotCard, { padding: spacing.lg, backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.cubeOutline} size={28} color={colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <AppText variant="h4">{item.packCode}</AppText>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>{getStatusLabel(effectiveStatus)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <AppText variant="caption" color="textSecondary">Tổng slot</AppText>
              <AppText variant="h3" color="primary">{item.totalSlots}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText variant="caption" color="textSecondary">Đã dùng</AppText>
              <AppText variant="h3">{item.usedSlots}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText variant="caption" color="textSecondary">Còn lại</AppText>
              <AppText variant="h3" color="success">{item.remainingSlots}</AppText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name={Icons.walletOutline} size={16} color={colors.textSecondary} style={styles.infoIcon} />
            <AppText variant="bodySmall" color="textSecondary">Giá: {formatCurrency(item.finalPrice ?? item.totalPrice ?? 0)}</AppText>
          </View>
          <View style={styles.infoRow}>
            <Icon name={Icons.cubeOutline} size={16} color={colors.primary} style={styles.infoIcon} />
            <AppText variant="bodySmall" color="textPrimary" style={{ fontWeight: '600' }}>
              Áp dụng cho: {getPackPackageLabel(item)}
            </AppText>
          </View>
          {item.expiresAt && (
            <View style={styles.infoRow}>
              <Icon name={Icons.calendarOutline} size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <AppText variant="bodySmall" color="textSecondary">Hết hạn: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}</AppText>
            </View>
          )}
          {getPackBranchLabel(item) ? (
            <View style={styles.infoRow}>
              <Icon name={Icons.locationOutline} size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <AppText variant="bodySmall" color="textSecondary">Chi nhánh: {getPackBranchLabel(item)}</AppText>
            </View>
          ) : null}
          {effectiveStatus === 'active' && item.remainingSlots > 0 && (
            <View style={styles.actions}>
              <Button title="Hủy gói slot" variant="outline" size="small" onPress={() => handleCancel(item)} loading={isCancelling} style={[styles.cancelButton, { flex: 1 }] as any} />
              <Button title="Đặt lịch nhanh" variant="primary" size="small" onPress={() => handleQuickBook(item)} style={{ flex: 1 } as any} />
            </View>
          )}
          {effectiveStatus === 'pending' && (
            <View style={styles.actions}>
              <Button title="Hủy gói slot" variant="outline" size="small" onPress={() => handleCancel(item)} loading={isCancelling} style={[styles.cancelButton, { flex: 1 }] as any} />
              <Button title="Tiếp tục thanh toán" variant="primary" size="small" onPress={() => handleResumePayment(item)} style={{ flex: 1 } as any} />
            </View>
          )}
      </Card>
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header showBack title="Gói slot" />
        <EmptyState icon={<Icon name={Icons.cubeOutline} size={48} color={colors.textTertiary} />} title="Vui lòng đăng nhập" message="Đăng nhập để xem gói slot" actionLabel="Đăng nhập" onAction={() => router.push('/(auth)/login' as any)} />
      </ScreenContainer>
    );
  }

  if (isLoading) return <Loading fullScreen message="Đang tải gói slot..." />;

  // Derived calculations for step 4
  const pkg = packages.find(p => p._id === selectedPackage);
  const discountPct = getDiscountPct(slotCount);
  const gross = (pkg?.price || 0) * slotCount;
  const qtyDiscount = Math.floor(gross * discountPct / 100);
  const baseTotal = gross - qtyDiscount;
  const voucherSavings = appliedVoucher ? appliedVoucher.discount : 0;
  const finalTotal = Math.max(0, baseTotal - voucherSavings);
  const branchObj = branches.find(b => b._id === selectedBranch);

  return (
    <ScreenContainer>
      <Header showBack title="Gói slot của tôi" rightAction={<TouchableOpacity onPress={startBuying}><Text style={{ color: colors.primary, fontWeight: '600' }}>Mua gói</Text></TouchableOpacity>} />

      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <SegmentedControl
          value={filterTab}
          onChange={(val) => setFilterTab(val as 'active' | 'history')}
          options={[
            { value: 'active', label: 'Đang hoạt động' },
            { value: 'history', label: 'Lịch sử' },
          ]}
          fullWidth
        />
      </View>

      <FlatList
        data={filteredPacks}
        renderItem={renderSlotPack}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <EmptyState icon={<Icon name={Icons.cubeOutline} size={48} color={colors.textTertiary} />} title="Chưa có gói slot" message="Mua gói slot để tiết kiệm chi phí rửa xe" actionLabel="Khám phá gói slot" onAction={startBuying} />
        }
        ListHeaderComponent={
          slotPacks.length > 0 ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.infoLight }]}>
              <Icon name={'information-circle-outline'} size={24} color={colors.info} style={styles.summaryIcon} />
              <View style={styles.summaryContent}>
                <AppText variant="bodySmall">Mua gói slot để tiết kiệm đến 20% chi phí rửa xe</AppText>
              </View>
            </View>
          ) : null
        }
        // "Mua thêm gói lượt" CTA mirrors FE PackagesSection — after the user
        // already owns packs, they still need an obvious path to buy another
        // one (different branch / package / vehicle combo).
        ListFooterComponent={
          slotPacks.length > 0 ? (
            <View style={styles.footerCtaWrap}>
              <Button
                title="+ Mua thêm gói lượt"
                onPress={startBuying}
                fullWidth
              />
              <AppText variant="caption" color="textTertiary" style={styles.footerHint}>
                Mỗi gói chỉ áp dụng cho 1 dịch vụ + chi nhánh cụ thể. Mua thêm để dùng cho gói khác.
              </AppText>
            </View>
          ) : null
        }
      />

      <Modal visible={isBuying} animationType="slide" onRequestClose={() => setIsBuying(false)}>
        <ScreenContainer edges={['top']} padded={false}>
          <Header
            title="Mua gói slot"
            showBack
            onBackPress={() => setIsBuying(false)}
            rightAction={
              <TouchableOpacity onPress={() => setIsBuying(false)} style={{ padding: 4 }}>
                <Icon name={Icons.close} size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            }
          />
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Wizard Headers */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4].map(s => (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step >= s ? colors.primary : colors.surfaceDark, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: step >= s ? '#fff' : colors.textTertiary, fontWeight: '700', fontSize: 12 }}>{step > s ? '✓' : s}</Text>
                  </View>
                  {s < 4 && <View style={{ width: 20, height: 2, backgroundColor: step > s ? colors.primary : colors.border, marginHorizontal: 4 }} />}
                </View>
              ))}
            </View>

            {step === 1 && (
              <View>
                <AppText variant="h4" style={{ marginBottom: 16 }}>Chọn chi nhánh</AppText>
                <PressableScale onPress={() => setSelectedBranch('ALL')} style={[styles.selectCard, selectedBranch === 'ALL' && { borderColor: colors.primary, backgroundColor: colors.primarySubtle }]}>
                  <AppText variant="body" style={{ fontWeight: '600' }}>🌍 Toàn hệ thống</AppText>
                  <AppText variant="caption" color="textSecondary">Dùng ở bất kỳ chi nhánh nào</AppText>
                </PressableScale>
                {branches.map(b => {
                  const pkgCount = branchPackageCounts[b._id] || 0;
                  const disabled = pkgCount === 0;
                  return (
                  <PressableScale
                    key={b._id}
                    onPress={disabled ? undefined : () => setSelectedBranch(b._id)}
                    style={[
                      styles.selectCard,
                      selectedBranch === b._id && !disabled && { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
                      disabled && { opacity: 0.5 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" style={{ fontWeight: '600' }}>{b.name}</AppText>
                        <AppText variant="caption" color="textSecondary">{b.address}</AppText>
                      </View>
                      {disabled ? (
                        <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                          <AppText variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>Chưa có gói</AppText>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                          <AppText variant="caption" style={{ color: colors.success, fontWeight: '600' }}>{pkgCount} gói</AppText>
                        </View>
                      )}
                    </View>
                  </PressableScale>
                  );
                })}
              </View>
            )}

            {step === 2 && (
              <View>
                <AppText variant="h4" style={{ marginBottom: 16 }}>Chọn xe</AppText>
                <PressableScale onPress={() => setSelectedVehicle('ALL')} style={[styles.selectCard, selectedVehicle === 'ALL' && { borderColor: colors.primary, backgroundColor: colors.primarySubtle }]}>
                  <AppText variant="body" style={{ fontWeight: '600' }}>🚗 Tất cả xe</AppText>
                  <AppText variant="caption" color="textSecondary">Không khóa cứng 1 biển số</AppText>
                </PressableScale>
                {vehicles.map(v => (
                  <PressableScale key={v._id} onPress={() => setSelectedVehicle(v._id)} style={[styles.selectCard, selectedVehicle === v._id && { borderColor: colors.primary, backgroundColor: colors.primarySubtle }]}>
                    <AppText variant="body" style={{ fontWeight: '600' }}>{v.brand} {v.model}</AppText>
                    <AppText variant="caption" color="textSecondary">{v.licensePlate}</AppText>
                  </PressableScale>
                ))}

                <AppText variant="h4" style={{ marginVertical: 16 }}>Chọn gói dịch vụ</AppText>
                {packages.length === 0 ? <AppText color="textSecondary">Không có gói khả dụng</AppText> : packages.map(p => (
                  <PressableScale key={p._id} onPress={() => setSelectedPackage(p._id)} style={[styles.selectCard, selectedPackage === p._id && { borderColor: colors.primary, backgroundColor: colors.primarySubtle }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="body" style={{ fontWeight: '600' }}>{p.name}</AppText>
                      <AppText variant="body" color="primary" style={{ fontWeight: '700' }}>{formatCurrency(p.price)}</AppText>
                    </View>
                    <AppText variant="caption" color="textSecondary">{p.description}</AppText>
                  </PressableScale>
                ))}
              </View>
            )}

            {step === 3 && (
              <View>
                <AppText variant="h4" style={{ marginBottom: 16 }}>Chọn số lần rửa xe</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
                  {DISCOUNT_TIERS.map(t => (
                    <View key={t.pct} style={{ width: '48%', padding: 12, backgroundColor: slotCount >= t.min && slotCount <= t.max ? colors.primarySubtle : colors.surfaceDark, borderRadius: 12, borderWidth: 1, borderColor: slotCount >= t.min && slotCount <= t.max ? colors.primary : colors.border }}>
                      <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>{t.min === 20 ? '20+' : `${t.min}-${t.max}`} lần</AppText>
                      <AppText variant="h4" color={t.pct > 0 ? "primary" : "textPrimary"} style={{ textAlign: 'center' }}>{t.pct > 0 ? `-${t.pct}%` : 'Giá gốc'}</AppText>
                      <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>{t.label}</AppText>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 24 }}>
                  <PressableScale onPress={() => setSlotCount(n => Math.max(1, n - 1))} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceDark, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 24 }}>-</Text></PressableScale>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, fontWeight: '800', color: colors.textPrimary }}>{slotCount}</Text>
                    <AppText variant="caption" color="textSecondary">lần</AppText>
                  </View>
                  <PressableScale onPress={() => setSlotCount(n => Math.min(50, n + 1))} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceDark, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 24 }}>+</Text></PressableScale>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {[1, 3, 5, 10, 15, 20].map(n => (
                    <PressableScale key={n} onPress={() => setSlotCount(n)} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: slotCount === n ? colors.primary : colors.surfaceDark }}>
                      <Text style={{ color: slotCount === n ? '#fff' : colors.textPrimary, fontWeight: '700' }}>{n}x</Text>
                    </PressableScale>
                  ))}
                </View>
              </View>
            )}

            {step === 4 && (
              <View>
                <AppText variant="h4" style={{ marginBottom: 16 }}>Voucher & Thanh toán</AppText>
                
                <PressableScale onPress={() => router.push(`/booking/voucher-picker?branchId=${selectedBranch === 'ALL' ? '' : selectedBranch}&orderAmount=${baseTotal}` as any)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Icon name={Icons.giftOutline} size={24} color={colors.primary} />
                    <View>
                      <AppText variant="body" style={{ fontWeight: '600' }}>Voucher & Ưu đãi</AppText>
                      <AppText variant="caption" color="textSecondary">{appliedVoucher ? appliedVoucher.code : 'Chọn mã giảm giá'}</AppText>
                    </View>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{appliedVoucher ? 'Thay đổi' : 'Chọn >'}</Text>
                </PressableScale>

                <View style={{ padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
                  <AppText variant="caption" color="textSecondary" style={{ marginBottom: 12, fontWeight: '600' }}>TÓM TẮT ĐƠN HÀNG</AppText>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><AppText variant="bodySmall">Chi nhánh</AppText><AppText variant="bodySmall" style={{ fontWeight: '600' }}>{branchObj?.name || 'Toàn hệ thống'}</AppText></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><AppText variant="bodySmall">Gói dịch vụ</AppText><AppText variant="bodySmall" style={{ fontWeight: '600' }}>{pkg?.name}</AppText></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><AppText variant="bodySmall">Số lần</AppText><AppText variant="bodySmall" style={{ fontWeight: '600' }}>{slotCount} lần</AppText></View>
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><AppText variant="bodySmall">Tạm tính</AppText><AppText variant="bodySmall">{formatCurrency(gross)}</AppText></View>
                  {discountPct > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><AppText variant="bodySmall" color="primary">Chiết khấu SL (-{discountPct}%)</AppText><AppText variant="bodySmall" color="primary">-{formatCurrency(qtyDiscount)}</AppText></View>}
                  {voucherSavings > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><AppText variant="bodySmall" color="primary">Voucher</AppText><AppText variant="bodySmall" color="primary">-{formatCurrency(voucherSavings)}</AppText></View>}
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><AppText variant="body" style={{ fontWeight: '700' }}>TỔNG THANH TOÁN</AppText><AppText variant="h3" color="primary">{formatCurrency(finalTotal)}</AppText></View>
                </View>

                {buyError ? <AppText color="error" style={{ marginBottom: 12, textAlign: 'center' }}>{buyError}</AppText> : null}

                <AppText variant="caption" color="textSecondary" style={{ marginBottom: 8, fontWeight: '600' }}>PHƯƠNG THỨC THANH TOÁN</AppText>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  <PressableScale onPress={() => setPaymentMethod('bank')} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: paymentMethod === 'bank' ? colors.primary : colors.border, backgroundColor: paymentMethod === 'bank' ? colors.primarySubtle : colors.surface, alignItems: 'center' }}>
                    <AppText variant="bodySmall" style={{ fontWeight: '600', color: paymentMethod === 'bank' ? colors.primary : colors.textPrimary }}>Ngân hàng</AppText>
                  </PressableScale>
                  <PressableScale onPress={() => setPaymentMethod('vnpay')} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: paymentMethod === 'vnpay' ? colors.primary : colors.border, backgroundColor: paymentMethod === 'vnpay' ? colors.primarySubtle : colors.surface, alignItems: 'center' }}>
                    <AppText variant="bodySmall" style={{ fontWeight: '600', color: paymentMethod === 'vnpay' ? colors.primary : colors.textPrimary }}>VNPay</AppText>
                  </PressableScale>
                </View>
              </View>
            )}
          </ScrollView>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom + 52, 88),
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: 'row',
              gap: 12,
              backgroundColor: colors.background,
            }}
          >
            {step === 1 || resumingPackId ? (
              <Button
                title="Hủy"
                variant="outline"
                onPress={() => {
                  setIsBuying(false);
                  setResumingPackId(null);
                }}
                disabled={buyLoading}
                style={{ flex: 1 }}
              />
            ) : (
              <Button
                title="Quay lại"
                variant="outline"
                onPress={() => setStep(step - 1)}
                disabled={buyLoading}
                style={{ flex: 1 }}
              />
            )}
            {step < 4 ? (
              <Button
                title="Tiếp theo"
                onPress={() => setStep(step + 1)}
                disabled={
                  (step === 1 && (!selectedBranch || (selectedBranch !== 'ALL' && (branchPackageCounts[selectedBranch] || 0) === 0))) ||
                  (step === 2 && (!selectedVehicle || !selectedPackage)) ||
                  (step === 3 && slotCount < 1)
                }
                style={{ flex: 1 }}
              />
            ) : (
              <Button
                title={`Thanh toán ${formatCurrency(finalTotal)}`}
                onPress={handleBuy}
                loading={buyLoading}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </ScreenContainer>
      </Modal>

      <BottomSheet
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Quét QR để thanh toán"
        snapPoints={[0.65]}
      >
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <AppText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.md }}>
            Sử dụng app ngân hàng để quét mã QR bên dưới. Gói slot sẽ được kích hoạt tự động sau khi hệ thống xác nhận thanh toán.
          </AppText>
          
          <View style={{
            padding: 16,
            backgroundColor: '#ffffff',
            borderRadius: borderRadius.xl,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 10,
            marginBottom: spacing.xl,
          }}>
            {pendingPaymentQr ? (
              <Image source={{ uri: pendingPaymentQr }} style={{ width: 220, height: 220 }} resizeMode="contain" />
            ) : (
              <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.infoLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full }}>
            <ActivityIndicator size="small" color={colors.info} />
            <AppText variant="bodySmall" style={{ marginLeft: 8, color: colors.info, fontWeight: '600' }}>
              {isPollingPayment 
                ? `Đang chờ thanh toán... (${Math.floor(qrCountdown / 60).toString().padStart(2, '0')}:${(qrCountdown % 60).toString().padStart(2, '0')})` 
                : 'Vui lòng không đóng màn hình'
              }
            </AppText>
          </View>
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const qrStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: spacing.md },
  qrWrapper: {
    width: 240,
    height: 240,
    padding: 12,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImage: { width: '100%', height: '100%' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 32 },
  doubleBezelOuter: {
    padding: 6,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  doubleBezelInner: {
    borderRadius: 18,
    padding: spacing.md,
  },
  summaryCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: layout.cardRadius, marginBottom: 16, ...shadows.md },
  summaryIcon: { marginRight: 12 },
  summaryContent: { flex: 1 },
  slotCard: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  headerInfo: { flex: 1 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#eee' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoIcon: { marginRight: 8, width: 20 },
  actions: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', gap: 12 },
  cancelButton: { borderColor: '#f44336' },
  selectCard: { padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, marginBottom: 12, backgroundColor: '#fff', ...shadows.sm },
  // Buy-more CTA footer (when packs already exist).
  footerCtaWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    gap: spacing.sm,
  },
  footerHint: {
    textAlign: 'center',
    lineHeight: 16,
  },
});

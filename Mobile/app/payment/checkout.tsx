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
  Modal,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSystemConfig } from '../../src/contexts/ConfigContext';
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
type PayMethod = 'bank' | 'vnpay' | 'wallet';

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

const WEEKDAYS_MAP: Record<number, string> = {
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  0: 'CN',
};

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, user } = useAuth();
  const colors = useColors();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const configs = useSystemConfig();

  const depositPercent = useMemo(() => {
    const rate = configs?.DEPOSIT_RATE;
    if (typeof rate === 'number') {
      return rate <= 1 ? Math.round(rate * 100) : rate;
    }
    return 30;
  }, [configs?.DEPOSIT_RATE]);

  const bottomActionStyle = [
    styles.bottomAction,
    {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      paddingBottom: Math.max(insets.bottom, 12) + 12,
    },
  ];

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
  const [showWebView, setShowWebView] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

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
    WebBrowser.dismissBrowser();
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
  const baseServiceAmount = useMemo(() => {
    if (isProvisional) {
      if (isRecurringType && recurringDraft) {
        return recurringDraft.totalAmount ?? 0;
      }
      const pkg = bookingCtx?.selectedPackage;
      const basePrice = pkg?.price ?? 0;
      const extras = checkoutExtras || {};
      const subTotal = (extras.selectedSubServices || []).reduce((sum: number, sub: any) => {
        const subService = (pkg as any)?.subServices?.find((s: any) => s.name === sub);
        return sum + (subService?.price ?? 0);
      }, 0);
      return basePrice + subTotal;
    }
    if (!booking) return 0;
    return booking.totalPrice ?? booking.finalPrice ?? 0;
  }, [booking, isProvisional, isRecurringType, recurringDraft, bookingCtx?.selectedPackage, checkoutExtras]);

  const activeVoucherDiscount = useMemo(() => {
    if (isProvisional) {
      const extras = checkoutExtras || {};
      return extras.voucherDiscount ?? bookingCtx?.voucher?.discountAmount ?? 0;
    }
    if (!booking) return 0;
    return booking.discountAmount ?? 0;
  }, [booking, isProvisional, checkoutExtras, bookingCtx?.voucher]);

  const totalAmount = useMemo(() => {
    if (isProvisional) {
      if (isRecurringType && recurringDraft) {
        return recurringDraft.totalAmount ?? 0;
      }
      return Math.max(0, baseServiceAmount - activeVoucherDiscount);
    }
    if (!booking) return 0;
    const beDeposit = booking.depositAmount ?? 0;
    const depositRate = configs?.DEPOSIT_RATE ?? 30;
    if (beDeposit > 0) {
      return Math.round(beDeposit / depositRate / 1000) * 1000;
    }
    return booking.finalPrice ?? booking.totalPrice ?? 0;
  }, [booking, isProvisional, isRecurringType, recurringDraft, baseServiceAmount, activeVoucherDiscount, configs]);

  const depositAmount = useMemo(() => {
    if (isProvisional) {
      if (isRecurringType && recurringDraft) {
        return recurringDraft.depositAmount ?? Math.round((totalAmount * (configs?.DEPOSIT_RATE ?? 0) / 100) / 1000) * 1000;
      }
      return Math.round((totalAmount * (configs?.DEPOSIT_RATE ?? 0) / 100) / 1000) * 1000;
    }
    if (!booking) return 0;
    return booking.depositAmount ?? Math.round((totalAmount * (configs?.DEPOSIT_RATE ?? 0) / 100) / 1000) * 1000;
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
    try {
      let p: any;
      if (bookingId) {
        p = await paymentApi.getPaymentByBooking(bookingId);
      } else if (payment?._id) {
        p = await paymentApi.getPayment(payment._id);
      } else {
        return false;
      }

      if (p?.status === 'paid' || (p as any)?.status === 'completed') {
        setPayment(p);
        if (!isProvisional) {
          setStep('success');
        }
        return true;
      }
    } catch {
      /* ignore poll errors */
    }
    return false;
  }, [bookingId, payment, isProvisional]);

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
      } else if (paymentMethod === 'wallet') {
        if (isProvisional) {
          const newBookingId = await createBookingFromDraft();
          if (newBookingId) {
            setCreatedBookingId(newBookingId);
            await paymentApi.createPayment({
               bookingId: newBookingId,
               paymentMethod: 'wallet',
               type: payType,
             });
            if (isRecurringType) {
              await AsyncStorage.removeItem('aw_recurring_draft');
            }
            bookingCtx?.resetAll?.();
            setStep('success');
          }
        } else {
          const p = await paymentApi.createPayment({
            bookingId,
            paymentMethod: 'wallet',
            type: payType,
          });
          setPayment(p);
          setStep('success');
        }
      } else {
        if (isProvisional) {
          const result = await paymentApi.createVnpayProvisional(amount, 'mobile');
          setPayment(result.payment ?? result);
          setVnpayUrl(result.paymentUrl);
          await WebBrowser.openBrowserAsync(result.paymentUrl);
        } else {
          const result = await paymentApi.createVnpayPayment({
            bookingId,
            paymentType: payType,
            amount,
            client: 'mobile',
          });
          setPayment(result.payment ?? result);
          setVnpayUrl(result.paymentUrl);
          await WebBrowser.openBrowserAsync(result.paymentUrl);
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
    
    let isCreating = false;
    const interval = setInterval(async () => {
      if (isCreating) return;
      
      const paid = await checkPaid();
      if (paid) {
        if (isProvisional) {
          isCreating = true;
          try {
            const payType = paymentMode === 'full' ? 'full' : 'deposit';
            const newBookingId = await createBookingFromDraft();
            if (newBookingId) {
              setCreatedBookingId(newBookingId);
              await linkPaymentToBooking(newBookingId, payType);
              if (isRecurringType) {
                await AsyncStorage.removeItem('aw_recurring_draft');
              }
              bookingCtx?.resetAll?.();
            }
            setStep('success');
          } catch (err) {
            isCreating = false;
          }
        }
      } else {
        setPollCount((c) => c + 1);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, bookingId, checkPaid, isProvisional, paymentMode, isRecurringType, createBookingFromDraft, linkPaymentToBooking, bookingCtx]);

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
      const isPaid = await checkPaid();
      if (!isPaid) {
        toast.error('Chưa nhận được thanh toán', 'Vui lòng chờ giây lát hoặc kiểm tra lại sau khi đã chuyển khoản.');
        setIsProcessing(false);
        return;
      }
      
      // Only proceed with booking creation after confirmed payment
      if (isProvisional) {
        const payType = paymentMode === 'full' ? 'full' : 'deposit';
        const newBookingId = await createBookingFromDraft();
        if (newBookingId) {
          setCreatedBookingId(newBookingId);
          await linkPaymentToBooking(newBookingId, payType);
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
      await WebBrowser.openBrowserAsync(vnpayUrl);
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

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('[WebView NavState] URL:', url);

    // 1. Nếu Backend thực hiện redirect về deep link
    if (url.startsWith('autowashpro://')) {
      setShowWebView(false);
      const paramsPart = url.split('?')[1] || '';
      const paramsObj: any = {};
      paramsPart.split('&').forEach((p: string) => {
        const [k, v] = p.split('=');
        paramsObj[k] = decodeURIComponent(v || '');
      });

      const vnpayResult = paramsObj.vnpay_result;
      if (vnpayResult) {
        try {
          let parsed: any;
          try {
            parsed = JSON.parse(vnpayResult);
          } catch {
            parsed = JSON.parse(decodeURIComponent(vnpayResult));
          }

          if (parsed?.success) {
            if (isProvisional) {
              const payType = paymentMode === 'full' ? 'full' : 'deposit';
              const newBookingId = await createBookingFromDraft();
              if (newBookingId) {
                setCreatedBookingId(newBookingId);
                await linkPaymentToBooking(newBookingId, payType);
                if (isRecurringType) {
                  await AsyncStorage.removeItem('aw_recurring_draft');
                }
                bookingCtx?.resetAll?.();
                setStep('success');
              }
            } else {
              await checkPaid();
            }
          } else {
            setError(parsed?.message || 'Thanh toán VNPay thất bại hoặc bị huỷ');
            setStep('amount');
          }
        } catch (err) {
          console.error('Parse vnpay_result in webview error:', err);
          if (!isProvisional) await checkPaid();
        }
      }
      return;
    }

    // 2. Fallback: Nếu WebView load đến vnpay-return của Backend nhưng không thể redirect về app
    if (url.includes('/payments/vnpay-return') && url.includes('vnp_ResponseCode')) {
      const urlParts = url.split('?');
      if (urlParts.length > 1) {
        const queryString = urlParts[1];
        const paramsObj: any = {};
        queryString.split('&').forEach((param: string) => {
          const [key, val] = param.split('=');
          paramsObj[key] = decodeURIComponent(val || '');
        });

        const responseCode = paramsObj.vnp_ResponseCode;
        const txnRef = paramsObj.vnp_TxnRef;

        if (responseCode === '00') {
          setTimeout(async () => {
            setShowWebView(false);
            if (isProvisional) {
              const payType = paymentMode === 'full' ? 'full' : 'deposit';
              try {
                if (txnRef) {
                  await paymentApi.vnpayCallback({
                    transactionId: txnRef,
                    gatewayTransactionId: paramsObj.vnp_TransactionNo || 'VNPAY',
                    status: 'success'
                  });
                }
                const newBookingId = await createBookingFromDraft();
                if (newBookingId) {
                  setCreatedBookingId(newBookingId);
                  await linkPaymentToBooking(newBookingId, payType);
                  if (isRecurringType) {
                    await AsyncStorage.removeItem('aw_recurring_draft');
                  }
                  bookingCtx?.resetAll?.();
                  setStep('success');
                }
              } catch (err) {
                console.error('Provisional fallback flow error:', err);
                setError('Thanh toán thành công nhưng không thể tạo lịch. Vui lòng liên hệ Admin.');
              }
            } else {
              await checkPaid();
            }
          }, 1500);
        } else {
          setShowWebView(false);
          setError('Thanh toán VNPay bị hủy hoặc không thành công');
          setStep('amount');
        }
      }
    }
  };

  const branchName = booking?.branchId 
    ? nameOf(booking.branchId) 
    : (isRecurringType ? recurringDraft?.branchName : bookingCtx?.selectedBranch?.name) || '—';

  const packageName = booking?.packageId
    ? nameOf(booking.packageId)
    : (isRecurringType ? recurringDraft?.packageName : bookingCtx?.selectedPackage?.name) || '—';

  const vehiclePlate = booking?.vehicleId
    ? plateOf(booking.vehicleId)
    : (isRecurringType ? recurringDraft?.vehiclePlate : bookingCtx?.selectedVehicle?.licensePlate) || '—';

  const displayDate = booking?.bookingDate
    ? formatBookingDate(booking.bookingDate)
    : (isRecurringType 
        ? (recurringDraft?.weekdays?.length > 0 ? recurringDraft.weekdays.map((w: number) => WEEKDAYS_MAP[w]).join(', ') + ' hàng tuần' : '—') 
        : formatBookingDate(bookingCtx?.selectedDate || ''));

  const displayTime = booking?.startTime 
    ? booking.startTime 
    : (isRecurringType ? recurringDraft?.startTime : bookingCtx?.selectedTime) || '—';

  const renderHomeAction = () => (
    <TouchableOpacity
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      onPress={() => {
        toast.info('Tiến trình đã được lưu', 'Bạn có thể tiếp tục thanh toán sau');
        router.replace('/');
      }}
      accessibilityRole="button"
      accessibilityLabel="Về trang chủ"
    >
      <Icon name={Icons.homeOutline} size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header title="Thanh toán" showBack rightAction={renderHomeAction()} />
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
        <Header title="Thanh toán" showBack rightAction={renderHomeAction()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!booking && !isProvisional) {
    return (
      <ScreenContainer>
        <Header title="Thanh toán" showBack rightAction={renderHomeAction()} />
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
        <View style={bottomActionStyle}>
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

          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <View style={[styles.doubleBezelOuter, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 0, padding: 6, borderRadius: 24 }]}>
              <View style={styles.doubleBezelInner}>
                <Image source={{ uri: payment.qrCode }} style={styles.qrImage} resizeMode="contain" />
              </View>
            </View>
          </View>

          {/* Bank transfer details */}
          <View style={[styles.doubleBezelOuter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.doubleBezelInner}>
              <View style={styles.summaryRow}>
                <AppText variant="body" color="textSecondary">
                  Số tiền cần chuyển
                </AppText>
                <AppText variant="h2" color="primary" style={{ fontWeight: '700' }}>
                  {formatCurrency(amount)}
                </AppText>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

              <View style={styles.bankDetailRow}>
                <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Ngân hàng</AppText>
                <AppText variant="body" style={{ flex: 1, fontWeight: '500', color: colors.textPrimary }}>
                  {payment.bankInfo?.bankName || 'Ngân hàng TMCP Quân đội (MB)'}
                </AppText>
              </View>
              <View style={styles.bankDetailRow}>
                <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Số tài khoản</AppText>
                <AppText variant="body" style={{ flex: 1, fontWeight: '500', color: colors.textPrimary }}>
                  {payment.bankInfo?.accountNumber || '9796688888'}
                </AppText>
              </View>
              <View style={styles.bankDetailRow}>
                <AppText variant="caption" color="textSecondary" style={{ width: 110 }}>Chủ tài khoản</AppText>
                <AppText variant="body" style={{ flex: 1, fontWeight: '500', color: colors.textPrimary }}>
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
                  <AppText variant="body" style={{ flex: 1, color: colors.textPrimary }}>
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
                    <AppText variant="body" color="textPrimary" style={{ fontWeight: '600' }}>
                      {formatCurrency(remainingAmount)}
                    </AppText>
                  </View>
                </>
              )}
            </View>
          </View>

          <AppText variant="caption" color="textTertiary" style={styles.pollingText}>
            Đang kiểm tra thanh toán... ({pollCount})
          </AppText>
        </ScrollView>

        <View style={bottomActionStyle}>
          <Button
            title="Đã chuyển khoản"
            onPress={handleConfirmTransfer}
            loading={isProcessing}
            fullWidth
            size="large"
            variant="primary"
          />
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <AppText variant="body" color="primary" style={{ fontWeight: '600' }}>
              Quay lại chọn phương thức khác
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

          <View style={[styles.doubleBezelOuter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.doubleBezelInner}>
              <View style={styles.summaryRow}>
                <AppText variant="body" color="textSecondary">
                  Số tiền cần thanh toán
                </AppText>
                <AppText variant="h2" color="primary" style={{ fontWeight: '700' }}>
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
                    <AppText variant="body" color="textPrimary" style={{ fontWeight: '600' }}>
                      {formatCurrency(remainingAmount)}
                    </AppText>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={[styles.center, { paddingVertical: spacing.lg }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>

          <AppText variant="caption" color="textTertiary" style={styles.pollingText}>
            Đang kiểm tra thanh toán... ({pollCount})
          </AppText>

          <View style={[styles.doubleBezelOuter, { backgroundColor: colors.warningLight, borderColor: colors.warning, padding: 6, borderRadius: 24 }]}>
            <View style={styles.doubleBezelInner}>
              <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', lineHeight: 16 }}>
                Nếu sau khi OTP xong trình duyệt báo lỗi, hãy quay lại app.
                Thanh toán vẫn có thể được xác nhận khi BE nhận IPN/return. Bấm "Kiểm tra lại" bên dưới.
              </AppText>
            </View>
          </View>
        </ScrollView>

        <View style={bottomActionStyle}>
          <Button title="Kiểm tra lại" onPress={() => checkPaid()} fullWidth size="large" />
          <Button
            title="Mở lại VNPay"
            variant="outline"
            onPress={handleReopenVnpay}
            fullWidth
            size="large"
            style={{ marginTop: spacing.sm }}
          />
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <AppText variant="body" color="primary" style={{ fontWeight: '600' }}>
              Quay lại chọn phương thức khác
            </AppText>
          </TouchableOpacity>
        </View>


      </ScreenContainer>
    );
  }

  // ------- AMOUNT (default) -------
  return (
    <ScreenContainer>
      <Header title="Thanh toán" showBack rightAction={renderHomeAction()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.warningLight }]}>
            <Icon name={Icons.wallet} size={28} color="#d97706" />
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

        {/* Unified Receipt Card */}
        <View style={[styles.premiumCard, { backgroundColor: colors.surface }]}>
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
            value={displayDate}
          />
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <DetailRow icon={Icons.timeOutline} label="Giờ" value={displayTime} />
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

          {/* Dash divider between details and price */}
          <View style={[styles.dashedDivider, { borderColor: colors.divider }]} />

          <View style={styles.summaryRow}>
            <AppText variant="body" color="textSecondary">
              Tổng dịch vụ
            </AppText>
            <AppText variant="body" style={styles.summaryValue}>
              {formatCurrency(baseServiceAmount > 0 ? baseServiceAmount : totalAmount)}
            </AppText>
          </View>

          {activeVoucherDiscount > 0 ? (
            <>
              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.summaryRow}>
                <AppText
                  variant="body"
                  style={{ color: '#059669', fontWeight: '600' }}
                >
                  {checkoutExtras?.voucherCode
                    ? `Voucher (${checkoutExtras.voucherCode})`
                    : bookingCtx?.voucher?.code
                    ? `Voucher (${bookingCtx.voucher.code})`
                    : (booking as any)?.voucherCode
                    ? `Voucher (${(booking as any).voucherCode})`
                    : 'Voucher giảm giá'}
                </AppText>
                <AppText variant="body" style={[styles.summaryValue, { color: '#059669', fontWeight: '700' }]}>
                  -{formatCurrency(activeVoucherDiscount)}
                </AppText>
              </View>
            </>
          ) : null}

          {activeVoucherDiscount > 0 ? (
            <>
              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.summaryRow}>
                <AppText variant="body" style={{ fontWeight: '700', color: colors.textPrimary }}>
                  Thành tiền
                </AppText>
                <AppText variant="body" style={[styles.summaryValue, { fontWeight: '700', color: colors.textPrimary }]}>
                  {formatCurrency(totalAmount)}
                </AppText>
              </View>
            </>
          ) : null}

          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

          {paymentMode === 'deposit' ? (
            <>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ color: '#d97706', fontWeight: '600' }}>
                    Đặt cọc ({depositPercent}%)
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {depositPercent}% × {formatCurrency(totalAmount)}
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
                <AppText variant="body" color="textPrimary" style={{ fontWeight: '600' }}>
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
                <AppText variant="body" color="textPrimary" style={{ fontWeight: '600' }}>
                  0đ
                </AppText>
              </View>
            </>
          )}
        </View>

        <AppText variant="label" color="textSecondary" style={styles.amountSectionLabel}>
          SỐ TIỀN CẦN THANH TOÁN
        </AppText>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setPaymentMode('deposit')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.selectableCard,
                {
                  backgroundColor: paymentMode === 'deposit' ? colors.primarySubtle : colors.surface,
                  borderColor: paymentMode === 'deposit' ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText
                variant="caption"
                color={paymentMode === 'deposit' ? 'primary' : 'textSecondary'}
                style={{ fontWeight: '600', marginBottom: 4 }}
              >
                Đặt cọc {depositPercent}%
              </AppText>
              <AppText
                variant="body"
                color={paymentMode === 'deposit' ? 'primary' : 'textPrimary'}
                style={{ fontWeight: '700' }}
              >
                {formatCurrency(depositAmount)}
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setPaymentMode('full')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.selectableCard,
                {
                  backgroundColor: paymentMode === 'full' ? colors.primarySubtle : colors.surface,
                  borderColor: paymentMode === 'full' ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText
                variant="caption"
                color={paymentMode === 'full' ? 'primary' : 'textSecondary'}
                style={{ fontWeight: '600', marginBottom: 4 }}
              >
                Thanh toán 100%
              </AppText>
              <AppText
                variant="body"
                color={paymentMode === 'full' ? 'primary' : 'textPrimary'}
                style={{ fontWeight: '700' }}
              >
                {formatCurrency(totalAmount)}
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        <AppText variant="label" color="textSecondary" style={[styles.methodLabel, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
          PHƯƠNG THỨC THANH TOÁN
        </AppText>

        <TouchableOpacity
          onPress={() => setPaymentMethod('wallet')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.selectableCard,
              {
                backgroundColor: paymentMethod === 'wallet' ? colors.primarySubtle : colors.surface,
                borderColor: paymentMethod === 'wallet' ? colors.primary : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
              },
            ]}
          >
            <View style={[styles.methodIconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.wallet} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={styles.methodName}>
                Ví AutoWash
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Số dư: {formatCurrency(user?.walletBalance || 0)}
              </AppText>
            </View>
            {paymentMethod === 'wallet' ? (
              <View style={[styles.optionCheck, { backgroundColor: colors.primary }]}>
                <AppText style={{ color: 'white', fontSize: 12 }}>✓</AppText>
              </View>
            ) : (
              <View style={[styles.optionCheckEmpty, { borderColor: colors.border }]} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPaymentMethod('bank')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.selectableCard,
              {
                backgroundColor: paymentMethod === 'bank' ? colors.primarySubtle : colors.surface,
                borderColor: paymentMethod === 'bank' ? colors.primary : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
              },
            ]}
          >
            <View style={[styles.methodIconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.card} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={styles.methodName}>
                Ngân hàng
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Chuyển khoản qua mã QR
              </AppText>
            </View>
            {paymentMethod === 'bank' ? (
              <View style={[styles.optionCheck, { backgroundColor: colors.primary }]}>
                <AppText style={{ color: 'white', fontSize: 12 }}>✓</AppText>
              </View>
            ) : (
              <View style={[styles.optionCheckEmpty, { borderColor: colors.border }]} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPaymentMethod('vnpay')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.selectableCard,
              {
                backgroundColor: paymentMethod === 'vnpay' ? colors.primarySubtle : colors.surface,
                borderColor: paymentMethod === 'vnpay' ? colors.primary : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginBottom: 0,
              },
            ]}
          >
            <View style={[styles.methodIconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.globeOutline} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={styles.methodName}>
                VNPay
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Cổng thanh toán VNPay
              </AppText>
            </View>
            {paymentMethod === 'vnpay' ? (
              <View style={[styles.optionCheck, { backgroundColor: colors.primary }]}>
                <AppText style={{ color: 'white', fontSize: 12 }}>✓</AppText>
              </View>
            ) : (
              <View style={[styles.optionCheckEmpty, { borderColor: colors.border }]} />
            )}
          </View>
        </TouchableOpacity>

        {/* Spacer so last content isn't hidden under sticky bottom bar */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={bottomActionStyle}>
        <View style={styles.bottomRow}>
          <View style={styles.bottomBack}>
            <Button title="Quay lại" variant="outline" onPress={() => router.back()} fullWidth size="medium" />
          </View>
          <View style={styles.bottomPay}>
            <Button
              title={paymentMode === 'full' ? 'Thanh toán' : 'Đặt cọc'}
              onPress={handleCreatePayment}
              loading={isProcessing}
              disabled={amount <= 0}
              fullWidth
              size="medium"
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
  premiumCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  dashedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  selectableCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  doubleBezelOuter: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  doubleBezelInner: {
    backgroundColor: 'transparent',
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  optionCheckEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginLeft: spacing.sm,
  },
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
    borderWidth: 1,
    borderColor: '#F1F5F9', // colors.borderLight
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
    borderWidth: 1,
    borderColor: '#F1F5F9', // colors.borderLight
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
    width: 180,
    height: 180,
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
    flex: 1,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});

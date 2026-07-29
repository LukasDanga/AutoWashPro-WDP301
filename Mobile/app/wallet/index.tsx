import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/contexts/AuthContext';
import { walletApi, paymentApi } from '../../src/api';
import { WalletTransaction } from '../../src/api/wallet';
import { sseService } from '../../src/services/sse';
import {
  Text as AppText,
  Icon,
  Icons,
  Button,
  ScreenContainer,
  Input,
  Loading,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency, formatDate } from '../../src/utils';

const { width } = Dimensions.get('window');
const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000];

export default function WalletScreen() {
  const router = useRouter();
  const { user, fetchUser: refreshUser } = useAuth();
  const colors = useColors();
  const styles = createStyles(colors);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  // Topup Modal State
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(PRESET_AMOUNTS[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'bank' | 'vnpay'>('bank');
  const [isProcessing, setIsProcessing] = useState(false);

  // QR Modal State
  const [sepayData, setSepayData] = useState<{ qrCodeUrl: string; transactionId: string; amount: number } | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await walletApi.getWalletTransactions({ limit: 50 });
      setTransactions(res.data);
    } catch (e) {
      console.error('Lỗi tải lịch sử ví:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshUser(), fetchTransactions()]);
    setLoading(false);
  }, [refreshUser, fetchTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const unsub = sseService.subscribe('wallet_topup_success', (event) => {
      const amount = event.data?.amount;
      setMessage(`Nạp tiền thành công: +${formatCurrency(amount)}`);
      setSepayData(null);
      setShowTopupModal(false);
      refreshUser();
      fetchTransactions();
      setTimeout(() => setMessage(''), 5000);
    });
    return unsub;
  }, [refreshUser, fetchTransactions]);

  const handleTopup = async () => {
    const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/g, ''), 10) : topupAmount;
    if (!finalAmount || finalAmount < 10000) {
      setMessage('Số tiền nạp tối thiểu là 10.000đ');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setIsProcessing(true);
    setMessage('');
    
    try {
      if (payMethod === 'bank') {
        const res = await paymentApi.createBankProvisional(finalAmount, 'topup');
        setSepayData({
          qrCodeUrl: (res as any).qrCodeUrl || `https://qr.sepay.vn/img?bank=MB&acc=6200320046868&amount=${finalAmount}&des=DAT COC ${(res as any).transactionId}`,
          transactionId: (res as any).transactionId,
          amount: finalAmount,
        });
        setShowTopupModal(false);
      } else if (payMethod === 'vnpay') {
        const res = await paymentApi.createVnpayProvisional(finalAmount, 'mobile', 'topup');
        if (res.paymentUrl) {
          setShowTopupModal(false);
          await WebBrowser.openBrowserAsync(res.paymentUrl);
          loadData();
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || 'Có lỗi xảy ra khi nạp tiền');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': 
      case 'credit': return Icons.arrowDown;
      case 'deduction': 
      case 'debit': return Icons.arrowUp;
      case 'bonus': return Icons.giftOutline;
      case 'refund': return Icons.refresh;
      default: return Icons.receiptOutline;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit': 
      case 'credit':
      case 'bonus': 
      case 'refund': 
        return '#059669'; // Emerald primary
      case 'deduction': 
      case 'debit':
        return '#EF4444'; // Red
      default: 
        return colors.textSecondary;
    }
  };

  const getTransactionSign = (type: string) => {
    return ['deposit', 'bonus', 'refund', 'credit'].includes(type) ? '+' : '-';
  };

  if (loading && !transactions.length) {
    return (
      <ScreenContainer>
        <Loading fullScreen message="Đang tải dữ liệu ví..." />
      </ScreenContainer>
    );
  }

  const rawBalance = user?.walletBalance || 0;
  const formattedRaw = rawBalance.toLocaleString('vi-VN');

  return (
    <ScreenContainer background="subtle">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
            <Icon name={Icons.arrowBack} size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText variant="h2" style={styles.headerTitle}>Ví AutoWash</AppText>
          </View>
          <View style={styles.headerIconBtn} />
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Icon name={Icons.shieldCheck} size={20} color="#059669" />
            <AppText variant="bodySmall" style={styles.messageText}>{message}</AppText>
          </View>
        ) : null}

        {/* Stunning Balance Card */}
        <View style={styles.balanceSection}>
          <LinearGradient
            colors={['#059669', '#064E3B']} // Vibrant Emerald gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Elegant glassmorphism background shapes */}
            <View style={styles.glassShape1} />
            <View style={styles.glassShape2} />
            
            <View style={styles.balanceCardInner}>
              <View style={styles.balanceLabelRow}>
                <View style={styles.walletIconPill}>
                  <Icon name={Icons.wallet} size={14} color="#059669" />
                </View>
                <AppText variant="bodySmall" style={styles.balanceLabelText}>Số dư khả dụng</AppText>
              </View>

              <View style={styles.balanceAmountContainer}>
                <AppText style={styles.balanceAmountValue} adjustsFontSizeToFit numberOfLines={1}>
                  {formattedRaw}
                </AppText>
                <AppText style={styles.balanceCurrency}>đ</AppText>
              </View>

              <View style={styles.balanceFooterRow}>
                <Icon name={Icons.shieldCheck} size={14} color="rgba(255,255,255,0.8)" />
                <AppText style={styles.secureText}>Bảo mật cấp độ ngân hàng</AppText>
              </View>
            </View>
          </LinearGradient>
          
          {/* Action Button - Floating slightly below */}
          <View style={styles.actionRowContainer}>
            <TouchableOpacity 
              style={styles.mainActionBtn} 
              onPress={() => setShowTopupModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainActionGradient}
              >
                <Icon name={Icons.addCircleOutline} size={22} color="#FFFFFF" />
                <AppText style={styles.mainActionText}>Nạp Tiền Vào Ví</AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="h3">Lịch sử giao dịch</AppText>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name={Icons.receiptOutline} size={48} color={colors.primary} />
            </View>
            <AppText variant="h3" style={styles.emptyTitle}>Chưa có giao dịch</AppText>
            <AppText variant="body" color="textSecondary" style={styles.emptyDesc}>
              Các giao dịch nạp và thanh toán của bạn sẽ hiển thị tại đây.
            </AppText>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((tx, index) => (
              <View key={tx._id} style={[
                styles.txItem,
                index === transactions.length - 1 && { borderBottomWidth: 0 }
              ]}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIconWrap, { backgroundColor: `${getTransactionColor(tx.type)}15` }]}>
                    <Icon name={getTransactionIcon(tx.type)} size={22} color={getTransactionColor(tx.type)} />
                  </View>
                  <View style={styles.txInfo}>
                    <AppText style={styles.txDesc} numberOfLines={2}>{tx.reason || tx.description}</AppText>
                    <AppText variant="caption" color="textTertiary">{formatDate(tx.createdAt)}</AppText>
                  </View>
                </View>
                <AppText style={[styles.txAmount, { color: getTransactionColor(tx.type) }]}>
                  {getTransactionSign(tx.type)}{formatCurrency(tx.amount)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Topup Modal */}
      <Modal
        visible={showTopupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopupModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlayBg}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <AppText variant="h2">Nạp tiền vào ví</AppText>
                    <TouchableOpacity onPress={() => setShowTopupModal(false)} style={styles.closeBtn}>
                      <Icon name={Icons.close} size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    <AppText variant="bodySmall" color="textSecondary" style={styles.label}>
                      Chọn mệnh giá
                    </AppText>
                    <View style={styles.amountGrid}>
                      {PRESET_AMOUNTS.map(amt => (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.amountOption,
                            !customAmount && topupAmount === amt && styles.amountOptionActive,
                          ]}
                          onPress={() => {
                            setCustomAmount('');
                            setTopupAmount(amt);
                          }}
                        >
                          <AppText
                            style={[
                              styles.amountOptionText,
                              !customAmount && topupAmount === amt && styles.amountOptionTextActive,
                            ]}
                          >
                            {formatCurrency(amt).replace(' đ', '').replace('đ', '')}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Input
                      placeholder="Hoặc nhập số tiền khác..."
                      value={customAmount}
                      onChangeText={(val) => {
                        const num = val.replace(/\D/g, '');
                        setCustomAmount(num ? formatCurrency(parseInt(num, 10)).replace('đ', '').trim() : '');
                      }}
                      keyboardType="numeric"
                      containerStyle={{ marginTop: spacing.lg }}
                    />

                    <AppText variant="bodySmall" color="textSecondary" style={[styles.label, { marginTop: spacing.xl }]}>
                      Phương thức thanh toán
                    </AppText>
                    <TouchableOpacity
                      style={[styles.payMethodOption, payMethod === 'bank' && styles.payMethodOptionActive]}
                      onPress={() => setPayMethod('bank')}
                    >
                      <View style={[styles.payIconBox, payMethod === 'bank' && styles.payIconBoxActive]}>
                        <Icon name={Icons.storefrontOutline} size={22} color={payMethod === 'bank' ? colors.primary : colors.textSecondary} />
                      </View>
                      <View style={styles.payMethodText}>
                        <AppText style={styles.payMethodTitle}>Chuyển khoản ngân hàng</AppText>
                        <AppText variant="caption" color="textSecondary">Mã QR tự động xác nhận nhanh</AppText>
                      </View>
                      <View style={[styles.radio, payMethod === 'bank' && styles.radioActive]}>
                        {payMethod === 'bank' && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.payMethodOption, payMethod === 'vnpay' && styles.payMethodOptionActive]}
                      onPress={() => setPayMethod('vnpay')}
                    >
                      <View style={[styles.payIconBox, payMethod === 'vnpay' && styles.payIconBoxActive]}>
                        <Icon name={Icons.cardOutline} size={22} color={payMethod === 'vnpay' ? colors.primary : colors.textSecondary} />
                      </View>
                      <View style={styles.payMethodText}>
                        <AppText style={styles.payMethodTitle}>Ví VNPay / Thẻ ATM</AppText>
                        <AppText variant="caption" color="textSecondary">Thanh toán qua cổng VNPay</AppText>
                      </View>
                      <View style={[styles.radio, payMethod === 'vnpay' && styles.radioActive]}>
                        {payMethod === 'vnpay' && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>

                    <Button
                      title={`Xác nhận nạp ${formatCurrency(customAmount ? parseInt(customAmount.replace(/\D/g, ''), 10) : topupAmount)}`}
                      onPress={handleTopup}
                      loading={isProcessing}
                      style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}
                      fullWidth
                    />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* QR Code Modal for Bank Transfer */}
      <Modal
        visible={!!sepayData}
        transparent
        animationType="fade"
        onRequestClose={() => setSepayData(null)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setSepayData(null)}>
              <Icon name={Icons.close} size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.qrHeaderIcon}>
              <Icon name={Icons.qrCodeOutline} size={32} color={colors.primary} />
            </View>
            <AppText variant="h2" style={styles.qrTitle}>Quét mã thanh toán</AppText>
            <AppText variant="body" color="textSecondary" style={styles.qrSubtitle}>
              Mở ứng dụng ngân hàng và quét mã QR này. Hệ thống sẽ tự động cập nhật số dư.
            </AppText>
            
            {sepayData && (
              <View style={styles.qrBoxWrapper}>
                <View style={styles.qrBox}>
                  <Image
                    source={{ uri: sepayData.qrCodeUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            <View style={styles.qrInfo}>
              <View style={styles.qrRow}>
                <AppText variant="body" color="textSecondary">Số tiền cần chuyển:</AppText>
                <AppText style={styles.qrAmount}>{sepayData ? formatCurrency(sepayData.amount) : ''}</AppText>
              </View>
            </View>

            <View style={styles.qrLoadingBox}>
              <Loading size="small" />
              <AppText variant="caption" color="primary" style={styles.qrWaitText}>
                Đang chờ thanh toán thành công...
              </AppText>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 40,
    right: 40,
    alignItems: 'center',
    zIndex: -1,
  },
  headerTitle: {
    textAlign: 'center',
    fontWeight: '700',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  messageText: {
    color: '#065F46',
    marginLeft: spacing.sm,
    fontWeight: '600',
    flex: 1,
  },
  
  // Balance Section
  balanceSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  balanceCard: {
    width: '100%',
    borderRadius: 24,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.lg,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  glassShape1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  glassShape2: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  balanceCardInner: {
    zIndex: 1,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletIconPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  balanceLabelText: {
    color: '#D1FAE5',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  balanceAmountValue: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceCurrency: {
    color: '#A7F3D0',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    marginLeft: 6,
    marginTop: 4,
  },
  balanceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  secureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  
  // Action row
  actionRowContainer: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    marginTop: -20, // Negative margin to overlap the card slightly
    zIndex: 2,
  },
  mainActionBtn: {
    width: '100%',
    borderRadius: borderRadius.full,
    ...shadows.md,
    shadowColor: '#059669',
    elevation: 6,
  },
  mainActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  mainActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: spacing.sm,
    letterSpacing: 0.5,
  },

  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },

  // Transaction List
  transactionList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  txDesc: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
    color: colors.textPrimary,
  },
  txAmount: {
    fontWeight: '700',
    fontSize: 16,
  },

  // Topup Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountOption: {
    width: (width - spacing.xl * 2 - spacing.sm) / 2, // 2 columns
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  amountOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  amountOptionText: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.textSecondary,
  },
  amountOptionTextActive: {
    color: colors.primary,
  },
  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  payMethodOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  payIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconBoxActive: {
    backgroundColor: `${colors.primary}1A`,
  },
  payMethodText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  payMethodTitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
    color: colors.textPrimary,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  // QR Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: colors.background,
    width: width - spacing.xl * 2,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    position: 'relative',
    ...shadows.lg,
  },
  qrCloseBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  qrHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  qrTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  qrSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  qrBoxWrapper: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  qrBox: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.sm,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrInfo: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  qrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  qrLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  qrWaitText: {
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});

/**
 * AutoWashPro Voucher Detail Screen
 * Shows voucher info and apply button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Share,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { voucherApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading,
  Button,
  Badge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Voucher } from '../../src/types';
import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function VoucherDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // Get return path - default to rewards
  const returnTo = '/rewards';

  useEffect(() => {
    if (id) {
      fetchVoucher();
    }
  }, [id]);

  const fetchVoucher = async () => {
    try {
      setIsLoading(true);
      const data = await voucherApi.getVoucherByCode(id || '');
      setVoucher(data);
    } catch (error) {
      console.error('Error fetching voucher:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!voucher?.code) return;
    try {
      await Share.share({
        message: `🎁 Mã voucher AutoWashPro: ${voucher.code}\nGiảm ${voucher.discountType === 'percent' ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue)}\nHết hạn: ${formatDate(voucher.expiresAt)}\n\nÁp dụng tại: autowashpro://`,
        title: 'Chia sẻ voucher AutoWashPro',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleApply = () => {
    // Navigate back with voucher data
    router.push({
      pathname: returnTo,
      params: { appliedVoucher: voucher?.code }
    });
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return 'Không có thông tin';
    try {
      const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
      if (!isValid(date)) return 'Không có thông tin';
      return format(date, 'dd/MM/yyyy', { locale: vi });
    } catch {
      return 'Không có thông tin';
    }
  };

  const isExpired = () => {
    if (!voucher?.expiresAt) return false;
    try {
      const expiryDate = parseISO(voucher.expiresAt);
      return !isValid(expiryDate) || expiryDate < new Date();
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải thông tin voucher..." />;
  }

  if (!voucher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Voucher</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <AppText variant="body" color="textSecondary">
            Không tìm thấy voucher
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const discountDisplay = voucher.discountType === 'percent' 
    ? `${voucher.discountValue}%`
    : formatCurrency(voucher.discountValue);
  
  const maxDiscountDisplay = voucher.maxDiscount 
    ? ` (tối đa ${formatCurrency(voucher.maxDiscount)})`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Chi tiết voucher</AppText>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareButton}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Voucher Card */}
        <View style={[styles.voucherCard, isExpired() && styles.voucherCardExpired]}>
          <View style={styles.voucherHeader}>
            <View style={styles.voucherIcon}>
              <Text style={styles.voucherEmoji}>🎟️</Text>
            </View>
            <View style={styles.voucherStatus}>
              {isExpired() ? (
                <Badge label="Hết hạn" variant="error" size="small" />
              ) : voucher.used ? (
                <Badge label="Đã sử dụng" variant="default" size="small" />
              ) : (
                <Badge label="Còn hiệu lực" variant="success" size="small" />
              )}
            </View>
          </View>

          <View style={styles.discountSection}>
            <Text style={styles.discountValue}>{discountDisplay}</Text>
            <Text style={styles.discountLabel}>
              {voucher.discountType === 'percent' ? 'GIẢM GIÁ' : 'GIẢM TRỰC TIẾP'}
              {maxDiscountDisplay}
            </Text>
          </View>

          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Mã voucher</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{voucher.code}</Text>
            </View>
          </View>
        </View>

        {/* Voucher Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Chi tiết voucher</Text>
          
          {/* Title */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📜</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Tên voucher</Text>
              <Text style={styles.detailValue}>{voucher.title || voucher.code}</Text>
            </View>
          </View>

          {/* Description */}
          {voucher.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📝</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mô tả</Text>
                <Text style={styles.detailValue}>{voucher.description}</Text>
              </View>
            </View>
          )}

          {/* Minimum Order */}
          {voucher.minOrderValue && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🛒</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Đơn tối thiểu</Text>
                <Text style={styles.detailValue}>{formatCurrency(voucher.minOrderValue)}</Text>
              </View>
            </View>
          )}

          {/* Expiry */}
          <View style={[styles.detailRow, styles.lastRow]}>
            <Text style={styles.detailIcon}>📅</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Hạn sử dụng</Text>
              <Text style={[styles.detailValue, isExpired() && styles.expiredText]}>
                {formatDate(voucher.expiresAt)}
                {isExpired() && ' (Đã hết hạn)'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Terms */}
        <Card style={styles.termsCard}>
          <Text style={styles.sectionTitle}>Điều kiện sử dụng</Text>
          <Text style={styles.termText}>
            • Voucher chỉ có giá trị sử dụng một lần{'\n'}
            • Không áp dụng đồng thời với các voucher khác{'\n'}
            • Áp dụng cho đơn hàng từ {voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : '0đ'} trở lên{'\n'}
            • Chỉ có thể sử dụng tại chi nhánh AutoWashPro{'\n'}
            • Không quy đổi thành tiền mặt
          </Text>
        </Card>
      </ScrollView>

      {/* Bottom Action */}
      {!isExpired() && !voucher.used && (
        <View style={styles.bottomAction}>
          <Button
            title="Áp dụng voucher"
            onPress={handleApply}
            fullWidth
            size="large"
            loading={isApplying}
          />
        </View>
      )}
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
  shareButton: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  voucherCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  voucherCardExpired: {
    backgroundColor: colors.textTertiary,
    opacity: 0.8,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  voucherIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherEmoji: {
    fontSize: 24,
  },
  voucherStatus: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  discountSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  discountValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  discountLabel: {
    ...typography.body,
    color: colors.textInverse,
    opacity: 0.9,
  },
  codeSection: {
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  codeBox: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  codeText: {
    ...typography.h4,
    color: colors.primary,
    letterSpacing: 2,
  },
  detailsCard: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  expiredText: {
    color: colors.error,
  },
  termsCard: {
    marginTop: spacing.md,
  },
  termText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
});

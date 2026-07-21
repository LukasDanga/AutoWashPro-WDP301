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
import { voucherApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading,
  Button,
  Badge,
  Icon,
  Icons,
  Header,
  ScreenContainer,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
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
  const colors = useColors();
  
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
      const data = await voucherApi.getVoucher(id || '');
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
        message: `Mã voucher AutoWashPro: ${voucher.code}\nGiảm ${voucher.type === 'percentage' ? `${voucher.value}%` : formatCurrency(voucher.value)}\nHết hạn: ${formatDate(voucher.endDate)}\n\nÁp dụng tại: autowashpro://`,
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
    if (!voucher?.endDate) return false;
    try {
      const expiryDate = parseISO(voucher.endDate);
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
      <ScreenContainer>
        <Header showBack title="Voucher" />
        <View style={styles.errorContainer}>
          <Icon name="close-circle-outline" size={48} color={colors.error} />
          <AppText variant="body" color="textSecondary">
            Không tìm thấy voucher
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const discountDisplay = voucher.type === 'percentage' 
    ? `${voucher.value}%` 
    : formatCurrency(voucher.value);
  
  const maxDiscountDisplay = voucher.maxDiscount 
    ? ` (tối đa ${formatCurrency(voucher.maxDiscount)})`
    : '';

  return (
    <ScreenContainer>
      <Header showBack title="Chi tiết voucher" rightAction={
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Icon name="share-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      } />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Voucher Card */}
        <View style={[styles.voucherCard, isExpired() && styles.voucherCardExpired]}>
          <View style={styles.voucherHeader}>
            <View style={styles.voucherIcon}>
              <Icon name="ticket-outline" size={28} color={colors.textInverse} />
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
              {voucher.type === 'percentage' ? 'GIẢM GIÁ' : 'GIẢM TRỰC TIẾP'}
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
            <Icon name="document-text-outline" size={20} color={colors.textSecondary} style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Tên voucher</Text>
              <Text style={styles.detailValue}>{voucher.name || voucher.code}</Text>
            </View>
          </View>

          {/* Description */}
          {voucher.description && (
            <View style={styles.detailRow}>
              <Icon name="text-outline" size={20} color={colors.textSecondary} style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mô tả</Text>
                <Text style={styles.detailValue}>{voucher.description}</Text>
              </View>
            </View>
          )}

          {/* Minimum Order */}
          {voucher.minOrder && voucher.minOrder > 0 ? (
            <View style={styles.detailRow}>
              <Icon name="cart-outline" size={20} color={colors.textSecondary} style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Đơn tối thiểu</Text>
                <Text style={styles.detailValue}>{formatCurrency(voucher.minOrder)}</Text>
              </View>
            </View>
          ) : null}

          {/* Expiry */}
          <View style={[styles.detailRow, styles.lastRow]}>
            <Icon name={Icons.calendarOutline} size={20} color={colors.textSecondary} style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Hạn sử dụng</Text>
              <Text style={[styles.detailValue, isExpired() && styles.expiredText]}>
                {formatDate(voucher.endDate)}
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
            • Áp dụng cho đơn hàng từ {voucher.minOrder ? formatCurrency(voucher.minOrder) : '0đ'} trở lên{'\n'}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  voucherCard: {
    backgroundColor: '#0286c8',
    borderRadius: 16,
    padding: 20,
  },
  voucherCardExpired: {
    backgroundColor: '#9e9e9e',
    opacity: 0.8,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voucherIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherStatus: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  discountValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  discountLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  codeSection: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
  },
  codeBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0286c8',
    letterSpacing: 2,
  },
  detailsCard: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  expiredText: {
    color: '#f44336',
  },
  termsCard: {
    marginTop: 16,
  },
  termText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});

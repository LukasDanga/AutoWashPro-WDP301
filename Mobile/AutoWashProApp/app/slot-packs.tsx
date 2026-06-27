/**
 * AutoWashPro Slot Packs Screen
 * User's purchased slot packs with cancel functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { slotPackApi } from '../src/api';
import { 
  Card, 
  Loading, 
  EmptyState,
  Button,
} from '../src/components/common';
import { Text as AppText } from '../src/components/common';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import { formatCurrency } from '../src/utils';
import type { SlotPack } from '../src/types';

export default function SlotPacksScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [slotPacks, setSlotPacks] = useState<SlotPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSlotPacks = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await slotPackApi.getMySlotPacks();
      setSlotPacks(data || []);
    } catch (error) {
      console.error('Error fetching slot packs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSlotPacks();
  }, [fetchSlotPacks]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSlotPacks();
  }, [fetchSlotPacks]);

  const handleCancel = (slotPack: SlotPack) => {
    Alert.alert(
      'Hủy gói slot',
      `Bạn có chắc chắn muốn hủy gói slot này không?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(slotPack._id);
            try {
              await slotPackApi.cancelSlotPack(slotPack._id);
              Alert.alert('Thành công', 'Đã hủy gói slot');
              fetchSlotPacks();
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể hủy gói slot');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: colors.successLight, text: colors.success };
      case 'expired':
        return { bg: colors.errorLight, text: colors.error };
      case 'cancelled':
        return { bg: colors.warningLight, text: colors.warning };
      default:
        return { bg: colors.surface, text: colors.textSecondary };
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Đang hoạt động',
      expired: 'Đã hết hạn',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  };

  const renderSlotPack = ({ item }: { item: SlotPack }) => {
    const statusStyle = getStatusColor(item.status);
    const isCancelling = cancellingId === item._id;
    const canCancel = item.status === 'active' && item.remainingSlots > 0;

    return (
      <Card style={styles.slotCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.slotIcon}>📦</Text>
          </View>
          <View style={styles.headerInfo}>
            <AppText variant="h4">{item.packCode}</AppText>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {getStatusLabel(item.status)}
              </Text>
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
            <AppText variant="caption" color="textSecondary">Đã sử dụng</AppText>
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
          <Text style={styles.infoIcon}>💰</Text>
          <AppText variant="bodySmall" color="textSecondary">
            Giá: {formatCurrency(item.finalPrice ?? item.totalPrice)}
          </AppText>
        </View>

        {item.expiresAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <AppText variant="bodySmall" color="textSecondary">
              Hết hạn: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}
            </AppText>
          </View>
        )}

        {item.branchId && typeof item.branchId === 'object' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <AppText variant="bodySmall" color="textSecondary">
              Chi nhánh: {item.branchId.name}
            </AppText>
          </View>
        )}

        {canCancel && (
          <View style={styles.actions}>
            <Button
              title="Hủy gói slot"
              variant="outline"
              size="small"
              onPress={() => handleCancel(item)}
              loading={isCancelling}
              style={styles.cancelButton}
            />
          </View>
        )}
      </Card>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gói slot</Text>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>📦</Text>}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem gói slot"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải gói slot..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gói slot của tôi</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={slotPacks}
        renderItem={renderSlotPack}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={{ fontSize: 48 }}>📦</Text>}
            title="Chưa có gói slot"
            message="Mua gói slot để tiết kiệm chi phí rửa xe"
            actionLabel="Khám phá gói slot"
            onAction={() => router.back()}
          />
        }
        ListHeaderComponent={
          slotPacks.length > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>💡</Text>
              <View style={styles.summaryContent}>
                <AppText variant="bodySmall">
                  Mua gói slot để tiết kiệm đến 20% chi phí rửa xe
                </AppText>
              </View>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { fontSize: 24, color: colors.primary },
  headerTitle: { ...typography.h4, color: colors.textPrimary },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  summaryIcon: { fontSize: 24, marginRight: spacing.md },
  summaryContent: { flex: 1 },
  slotCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  slotIcon: { fontSize: 28 },
  headerInfo: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    width: 20,
  },
  actions: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cancelButton: {
    borderColor: colors.error,
  },
});

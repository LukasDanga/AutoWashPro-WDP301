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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { slotPackApi } from '../src/api';
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
} from '../src/components/common';
import { useColors } from '../src/theme/ThemeContext';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import { formatCurrency } from '../src/utils';
import type { SlotPack } from '../src/types';

export default function SlotPacksScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

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
    AlertDialog.confirm(
      'Hủy gói slot',
      'Bạn có chắc chắn muốn hủy gói slot này không? Hành động này không thể hoàn tác.',
      async () => {
        setCancellingId(slotPack._id);
        try {
          await slotPackApi.cancelSlotPack(slotPack._id);
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
      'Không',
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
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Icon name={Icons.cubeOutline} size={28} color={colors.primary} />
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
          <Icon name={Icons.walletOutline} size={16} color={colors.textSecondary} style={styles.infoIcon} />
          <AppText variant="bodySmall" color="textSecondary">
            Giá: {formatCurrency(item.finalPrice ?? item.totalPrice)}
          </AppText>
        </View>

        {item.expiresAt && (
          <View style={styles.infoRow}>
            <Icon name={Icons.calendarOutline} size={16} color={colors.textSecondary} style={styles.infoIcon} />
            <AppText variant="bodySmall" color="textSecondary">
              Hết hạn: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}
            </AppText>
          </View>
        )}

        {item.branchId && typeof item.branchId === 'object' && (
          <View style={styles.infoRow}>
            <Icon name={Icons.locationOutline} size={16} color={colors.textSecondary} style={styles.infoIcon} />
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
      <ScreenContainer>
        <Header showBack title="Gói slot" />
        <EmptyState
          icon={<Icon name={Icons.cubeOutline} size={48} color={colors.textTertiary} />}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem gói slot"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải gói slot..." />;
  }

  return (
    <ScreenContainer>
      <Header showBack title="Gói slot của tôi" />

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
            icon={<Icon name={Icons.cubeOutline} size={48} color={colors.textTertiary} />}
            title="Chưa có gói slot"
            message="Mua gói slot để tiết kiệm chi phí rửa xe"
            actionLabel="Khám phá gói slot"
            onAction={() => router.back()}
          />
        }
        ListHeaderComponent={
          slotPacks.length > 0 ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.infoLight }]}>
              <Icon name={'information-circle-outline'} size={24} color={colors.info} style={styles.summaryIcon} />
              <View style={styles.summaryContent}>
                <AppText variant="bodySmall">
                  Mua gói slot để tiết kiệm đến 20% chi phí rửa xe
                </AppText>
              </View>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryIcon: {
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  slotCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
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
    backgroundColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
    width: 20,
  },
  actions: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    borderColor: '#f44336',
  },
});

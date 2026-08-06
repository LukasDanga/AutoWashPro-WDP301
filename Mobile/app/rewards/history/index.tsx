import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import { loyaltyApi } from '../../../src/api/loyalty';
import type { PointHistory } from '../../../src/types';
import { ScreenContainer, Header, Text, Icon, Card, Badge, EmptyState, Icons } from '../../../src/components/common';
import { useColors, spacing } from '../../../src/theme';

export default function PointHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();

  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await loyaltyApi.getMyHistory({ limit: 50 });
      // res is already the unwrapped array (apiClient interceptor unwraps { data: [...] })
      setHistory(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error('Error fetching point history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }: { item: PointHistory }) => {
    const isEarned = item.type === 'earned' || (item.type === 'adjustment' && item.points > 0);
    const sign = isEarned ? '+' : '';
    const pointsColor = isEarned ? colors.success : colors.error;

    return (
      <TouchableOpacity onPress={() => router.push(`/rewards/history/${item._id}` as any)} activeOpacity={0.7}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
              <View style={[styles.iconWrap, { backgroundColor: isEarned ? colors.successLight : colors.errorLight }]}>
                <Icon name={isEarned ? Icons.trendingUp : Icons.trendingDown} size={24} color={pointsColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text variant="body" weight="700" color="textPrimary" numberOfLines={2} style={{ flex: 1 }}>
                    {item.description || 'Giao dịch điểm'}
                  </Text>
                  <Text variant="h3" style={{ color: pointsColor, marginLeft: 8 }}>
                    {sign}{item.points}
                  </Text>
                </View>
                <Text variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
                  {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Badge
              label={isEarned ? 'Tích điểm' : item.type === 'redeemed' ? 'Đổi quà' : item.type === 'expired' ? 'Hết hạn' : 'Điều chỉnh'}
              variant={isEarned ? 'success' : 'default'}
              size="small"
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer background="subtle">
      <Header title="Lịch sử điểm thưởng" showBack />
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text color="textSecondary">Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              iconName={Icons.voucherOutline}
              title="Chưa có lịch sử"
              message="Bạn chưa có giao dịch điểm thưởng nào."
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

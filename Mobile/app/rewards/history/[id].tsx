import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';

import { loyaltyApi } from '../../../src/api/loyalty';
import { ScreenContainer, Header, Text, Icon, Card, Icons, Button } from '../../../src/components/common';
import { useColors, spacing } from '../../../src/theme';
import { formatCurrency } from '../../../src/utils';

export default function PointHistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await loyaltyApi.getHistoryDetail(id as string);
        // res is already unwrapped by apiClient interceptor
        setData(res && typeof res === 'object' && !Array.isArray(res) ? (res.data || res) : res);
      } catch (error) {
        console.error('Error fetching point history detail:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <ScreenContainer background="subtle">
        <Header title="Chi tiết giao dịch" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text color="textSecondary">Đang tải...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer background="subtle">
        <Header title="Chi tiết giao dịch" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text color="textSecondary">Không tìm thấy thông tin</Text>
        </View>
      </ScreenContainer>
    );
  }

  const isEarned = data.type === 'earned' || (data.type === 'adjustment' && data.points > 0);
  const pointsColor = isEarned ? colors.success : colors.error;
  const sign = isEarned ? '+' : '';

  // Extract booking/order info if populated
  const ref = data.referenceId;
  const isBooking = ref && ref.bookingCode;
  const bookingCode = isBooking ? ref.bookingCode : null;
  const orderAmount = isBooking ? ref.finalPrice : 0;
  const branchName = isBooking && ref.branchId ? ref.branchId.name : null;

  return (
    <ScreenContainer background="subtle">
      <Header title="Chi tiết giao dịch" showBack />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Main Point Card */}
        <Card style={[styles.card, { borderColor: isEarned ? colors.successLight : colors.errorLight, borderWidth: 1 }]}>
          <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <View style={[styles.iconWrapLg, { backgroundColor: isEarned ? colors.successLight : colors.errorLight }]}>
              <Icon name={isEarned ? Icons.trendingUp : Icons.trendingDown} size={40} color={pointsColor} />
            </View>
            <Text variant="h1" style={{ color: pointsColor, marginTop: spacing.md, fontSize: 32 }}>
              {sign}{data.points}
            </Text>
            <Text variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
              {isEarned ? 'TÍCH ĐIỂM THƯỞNG' : data.type === 'redeemed' ? 'ĐỔI QUÀ' : data.type === 'expired' ? 'ĐIỂM HẾT HẠN' : 'ĐIỀU CHỈNH'}
            </Text>
            <Text variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
              {format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm')}
            </Text>
          </View>
        </Card>

        {/* Details Card */}
        <Card style={styles.card}>
          <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
            Nội dung chi tiết
          </Text>
          <Text variant="body" color="textPrimary" style={{ lineHeight: 22 }}>
            {data.description}
          </Text>
        </Card>

        {/* Booking/Order Info */}
        {isBooking && (
          <Card style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text variant="overline" color="textTertiary">
                Chi tiết đơn hàng
              </Text>
              <Button
                title="Xem đơn hàng"
                variant="outline"
                size="small"
                onPress={() => router.push(`/booking/${ref._id}` as any)}
                style={{ paddingHorizontal: 12, paddingVertical: 4 } as any}
              />
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodySmall" color="textSecondary">Mã đơn hàng</Text>
              <Text variant="bodySmall" color="primary" weight="700">#{bookingCode}</Text>
            </View>

            {orderAmount > 0 && (
              <View style={styles.infoRow}>
                <Text variant="bodySmall" color="textSecondary">Giá trị đơn</Text>
                <Text variant="bodySmall" color="textPrimary" weight="700">{formatCurrency(orderAmount)}</Text>
              </View>
            )}

            {branchName && (
              <View style={styles.infoRow}>
                <Text variant="bodySmall" color="textSecondary">Chi nhánh</Text>
                <Text variant="bodySmall" color="textPrimary" weight="600">{branchName}</Text>
              </View>
            )}
          </Card>
        )}

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  iconWrapLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0', // colors.border
  },
});

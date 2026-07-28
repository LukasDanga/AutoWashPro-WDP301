/**
 * AutoWashPro Vehicle Management Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { vehicleApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  EmptyState,
  Button,
  Icon,
  Header,
  ScreenContainer,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Vehicle } from '../../src/types';

export default function VehicleScreen() {
  const router = useRouter();
  const colors = useColors();
  const toast = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await vehicleApi.getVehicles();
      setVehicles(response);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [fetchVehicles])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = (vehicle: Vehicle) => {
    AlertDialog.confirm(
      'Xóa phương tiện',
      `Bạn có chắc chắn muốn xóa xe ${vehicle.licensePlate}? Hành động này không thể hoàn tác.`,
      async () => {
        setIsDeleting(vehicle._id);
        try {
          await vehicleApi.deleteVehicle(vehicle._id);
          setVehicles(vehicles.filter((v) => v._id !== vehicle._id));
          toast.success('Đã xóa phương tiện', 'Phương tiện đã được xóa khỏi danh sách');
        } catch (error: any) {
          const errMsg = error.response?.data?.message || error.message || 'Không thể xóa phương tiện';
          if (errMsg.includes('lịch hẹn đang hoạt động')) {
            const countMatch = errMsg.match(/(\d+)\s*lịch hẹn/);
            const count = countMatch ? parseInt(countMatch[1], 10) : 0;
            const codesMatch = errMsg.match(/Mã:\s*(.+)/);
            const codesRaw = codesMatch ? codesMatch[1].trim() : '';
            const bookingItems = codesRaw.split(/,\s*/).filter(Boolean);
            const bookings = bookingItems.map((item: string) => {
              const m = item.match(/(\S+)\s*\((.+?)\s+(\S+)\)/);
              return m ? { code: m[1], date: m[2], time: m[3] } : { code: item, date: '', time: '' };
            });

            AlertDialog.show({
              title: 'Không thể xóa phương tiện',
              variant: 'warning',
              actions: [{ text: 'Đã hiểu', style: 'default' }],
              customContent: (
                <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                    <AppText variant="bodySmall" style={{ color: '#92400E' }}>
                      Xe <AppText variant="bodySmall" weight="700" style={{ color: '#92400E' }}>{vehicle.licensePlate}</AppText> đang có <AppText variant="bodySmall" weight="700" style={{ color: '#92400E' }}>{count} lịch hẹn đang hoạt động</AppText>. Vui lòng hoàn thành hoặc hủy các lịch hẹn này trước khi xóa xe.
                    </AppText>
                  </View>
                  {bookings.length > 0 && (
                    <View style={{ gap: spacing.xs }}>
                      <AppText variant="caption" weight="700" color="textTertiary">
                        CÁC LỊCH HẸN ĐANG HOẠT ĐỘNG:
                      </AppText>
                      <View style={{ borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                        {bookings.slice(0, 2).map((b: any, i: number) => (
                          <View key={i} style={{ flexDirection: 'row', padding: spacing.sm, borderBottomWidth: i === 0 && bookings.length > 1 ? 1 : 0, borderBottomColor: colors.border, alignItems: 'center', gap: spacing.sm }}>
                            <AppText variant="body" style={{ opacity: 0.8 }}>📅</AppText>
                            <View>
                              <AppText variant="bodySmall" weight="600">{b.code}</AppText>
                              <AppText variant="caption" color="textTertiary">{b.date} • {b.time}</AppText>
                            </View>
                          </View>
                        ))}
                        {bookings.length > 2 && (
                          <TouchableOpacity 
                            style={{ padding: spacing.sm, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }}
                            onPress={() => {
                              AlertDialog.hide?.();
                              router.push(`/(tabs)/history?view=list&keyword=${encodeURIComponent(vehicle.licensePlate)}`);
                            }}
                          >
                            <AppText variant="caption" color="primary" weight="600">Xem thêm {bookings.length - 2} lịch hẹn ➔</AppText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.sm }}>
                    <AppText variant="body" style={{ opacity: 0.8 }}>💡</AppText>
                    <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                      Bạn có thể hủy lịch hẹn hoặc đợi đến khi hoàn thành trước khi thực hiện xóa xe.
                    </AppText>
                  </View>
                </View>
              )
            });
          } else {
            AlertDialog.error('Lỗi', errMsg);
          }
        } finally {
          setIsDeleting(null);
        }
      },
      undefined,
      'Xóa',
      'Hủy',
    );
  };

  const getVehicleTypeIcon = (type: string): string => {
    switch (type) {
      case 'sedan': return 'car-outline';
      case 'suv': return 'car-sport-outline';
      case 'pickup': return 'car-outline';
      case 'van': return 'bus-outline';
      default: return 'car-outline';
    }
  };

  const getVehicleTypeLabel = (type: string): string => {
    switch (type) {
      case 'sedan': return 'Sedan';
      case 'suv': return 'SUV';
      case 'pickup': return 'Pickup';
      case 'van': return 'Van';
      default: return 'Sedan';
    }
  };

  const renderVehicleCard = ({ item }: { item: Vehicle }) => (
    <Card style={styles.vehicleCard}>
      <View style={styles.cardContent}>
        <View style={styles.vehicleIcon}>
          <Icon
            name={getVehicleTypeIcon(item.vehicleType)}
            size={28}
            color={colors.primary}
          />
        </View>
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleHeader}>
            <AppText variant="h4">{item.licensePlate}</AppText>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <AppText variant="caption" style={styles.defaultText}>Mặc định</AppText>
              </View>
            )}
          </View>
          <AppText variant="bodySmall" color="textSecondary">
            {item.brand} {item.model && `• ${item.model}`}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {item.color} • {getVehicleTypeLabel(item.vehicleType)}
          </AppText>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/vehicle/form', params: { id: item._id } })}
            accessibilityLabel="Sửa phương tiện"
            accessibilityRole="button"
          >
            <Icon name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            accessibilityLabel="Xóa phương tiện"
            accessibilityRole="button"
            disabled={isDeleting === item._id}
          >
            {isDeleting === item._id ? (
              <Loading />
            ) : (
              <Icon name="trash-outline" size={18} color={colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <ScreenContainer
      edges={['top']}
      bottomPadding={100}
    >
      <Header 
        showBack 
        title="Quản lý xe" 
        rightAction={
          <TouchableOpacity 
            onPress={() => router.push('/vehicle/form')}
            style={styles.addButton}
            accessibilityLabel="Thêm phương tiện mới"
            accessibilityRole="button"
          >
            <Icon name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={vehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item._id}
        initialNumToRender={5}
        windowSize={5}
        maxToRenderPerBatch={5}
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
            icon={<Icon name="car-outline" size={48} color={colors.textTertiary} />}
            title="Chưa có phương tiện"
            message="Thêm phương tiện để đặt lịch rửa xe nhanh hơn"
            actionLabel="Thêm xe"
            onAction={() => router.push('/vehicle/form')}
          />
        }
      />

      <View style={styles.bottomAction}>
        <Button
          title="+ Thêm phương tiện mới"
          onPress={() => router.push('/vehicle/form')}
          fullWidth
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  vehicleCard: {
    marginBottom: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  defaultBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  defaultText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'transparent',
  },
});

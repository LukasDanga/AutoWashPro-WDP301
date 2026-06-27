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
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehicleApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading, 
  EmptyState,
  Button,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Vehicle } from '../../src/types';

export default function VehicleScreen() {
  const router = useRouter();

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

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      'Xóa phương tiện',
      `Bạn có chắc chắn muốn xóa xe ${vehicle.licensePlate}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(vehicle._id);
            try {
              await vehicleApi.deleteVehicle(vehicle._id);
              setVehicles(vehicles.filter(v => v._id !== vehicle._id));
              Alert.alert('Thành công', 'Đã xóa phương tiện');
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa phương tiện');
            } finally {
              setIsDeleting(null);
            }
          },
        },
      ]
    );
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case 'sedan': return '🚗';
      case 'suv': return '🚙';
      case 'pickup': return '🛻';
      case 'van': return '🚐';
      case 'motorcycle': return '🏍️';
      default: return '🚗';
    }
  };

  const renderVehicleCard = ({ item }: { item: Vehicle }) => (
    <Card style={styles.vehicleCard}>
      <View style={styles.cardContent}>
        <View style={styles.vehicleIcon}>
          <Text style={styles.vehicleEmoji}>{getVehicleTypeIcon(item.vehicleType)}</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleHeader}>
            <AppText variant="h4">{item.licensePlate}</AppText>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Mặc định</Text>
              </View>
            )}
          </View>
          <AppText variant="bodySmall" color="textSecondary">
            {item.brand} {item.model && `• ${item.model}`}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {item.color} • {item.vehicleType}
          </AppText>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/vehicle/edit?id=${item._id}`)}
          >
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            disabled={isDeleting === item._id}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Quản lý xe</AppText>
        <TouchableOpacity onPress={() => router.push('/vehicle/add')}>
          <Text style={styles.addButton}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        renderItem={renderVehicleCard}
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
            icon={<Text style={{ fontSize: 48 }}>🚗</Text>}
            title="Chưa có phương tiện"
            message="Thêm phương tiện để đặt lịch rửa xe nhanh hơn"
            actionLabel="Thêm xe"
            onAction={() => router.push('/vehicle/add')}
          />
        }
      />

      <View style={styles.bottomAction}>
        <Button
          title="+ Thêm phương tiện mới"
          onPress={() => router.push('/vehicle/add')}
          fullWidth
        />
      </View>
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
  addButton: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  vehicleEmoji: {
    fontSize: 28,
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  defaultText: {
    ...typography.caption,
    color: colors.textInverse,
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
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
});

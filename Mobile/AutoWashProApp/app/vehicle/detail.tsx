/**
 * AutoWashPro Vehicle Detail Screen
 * Shows vehicle info and booking history
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehicleApi, bookingApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading,
  EmptyState,
  BookingStatusBadge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Vehicle, Booking } from '../../src/types';

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchVehicleData();
    }
  }, [id]);

  const fetchVehicleData = async () => {
    try {
      setIsLoading(true);
      const vehicleData = await vehicleApi.getVehicle(id!);
      setVehicle(vehicleData);
      
      // Fetch recent bookings for this vehicle
      // Note: In a real app, you'd have a specific endpoint for vehicle bookings
      const allBookings = await bookingApi.getMyBookings();
      const vehicleBookings = (allBookings.data || []).filter((b: Booking) => {
        if (typeof b.vehicleId === 'object' && b.vehicleId) {
          return b.vehicleId._id === id;
        }
        return false;
      }).slice(0, 5);
      setRecentBookings(vehicleBookings);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin phương tiện');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async () => {
    if (!vehicle) return;
    
    try {
      await vehicleApi.updateVehicle(vehicle._id, { isDefault: true });
      setVehicle({ ...vehicle, isDefault: true });
      Alert.alert('Thành công', 'Đã đặt làm phương tiện mặc định');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật');
    }
  };

  const handleEdit = () => {
    router.push(`/vehicle/edit?id=${id}`);
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

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case 'sedan': return 'Sedan';
      case 'suv': return 'SUV';
      case 'pickup': return 'Pickup';
      case 'van': return 'Van';
      case 'motorcycle': return 'Xe máy';
      default: return type;
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Chi tiết xe</AppText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          title="Không tìm thấy"
          message="Phương tiện không tồn tại"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Chi tiết xe</AppText>
        <TouchableOpacity onPress={handleEdit}>
          <Text style={styles.editButton}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Card */}
        <Card style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}>
            <Text style={styles.vehicleEmoji}>
              {getVehicleTypeIcon(vehicle.vehicleType)}
            </Text>
          </View>
          
          <AppText variant="h2" style={styles.licensePlate}>
            {vehicle.licensePlate}
          </AppText>
          
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {getVehicleTypeLabel(vehicle.vehicleType)}
            </Text>
          </View>

          {vehicle.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>⭐ Xe mặc định</Text>
            </View>
          )}
        </Card>

        {/* Vehicle Details */}
        <Card style={styles.detailsCard}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Thông tin phương tiện
          </AppText>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏷️</Text>
            <View style={styles.detailContent}>
              <AppText variant="caption" color="textSecondary">
                Hãng xe
              </AppText>
              <AppText variant="body">{vehicle.brand}</AppText>
            </View>
          </View>

          {vehicle.model && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🚙</Text>
              <View style={styles.detailContent}>
                <AppText variant="caption" color="textSecondary">
                  Dòng xe
                </AppText>
                <AppText variant="body">{vehicle.model}</AppText>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🎨</Text>
            <View style={styles.detailContent}>
              <AppText variant="caption" color="textSecondary">
                Màu sắc
              </AppText>
              <AppText variant="body">{vehicle.color}</AppText>
            </View>
          </View>

          {vehicle.year && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={styles.detailContent}>
                <AppText variant="caption" color="textSecondary">
                  Năm sản xuất
                </AppText>
                <AppText variant="body">{vehicle.year}</AppText>
              </View>
            </View>
          )}
        </Card>

        {/* Actions */}
        {!vehicle.isDefault && (
          <Card style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSetDefault}>
              <Text style={styles.actionIcon}>⭐</Text>
              <View style={styles.actionContent}>
                <AppText variant="body">Đặt làm xe mặc định</AppText>
                <AppText variant="caption" color="textSecondary">
                  Xe mặc định sẽ được chọn tự động khi đặt lịch
                </AppText>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <>
            <AppText variant="h4" style={styles.sectionHeader}>
              Lịch sử gần đây
            </AppText>
            {recentBookings.map((booking) => (
              <TouchableOpacity
                key={booking._id}
                onPress={() => router.push(`/booking/${booking._id}`)}
              >
                <Card style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View>
                      <AppText variant="bodySmall" color="textSecondary">
                        {booking.bookingDate} • {booking.startTime}
                      </AppText>
                      <AppText variant="body">
                        #{booking._id.slice(-8).toUpperCase()}
                      </AppText>
                    </View>
                    <BookingStatusBadge status={booking.status} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Quick Book */}
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => router.push({
            pathname: '/booking',
            params: { vehicleId: vehicle._id }
          })}
        >
          <Text style={styles.bookButtonIcon}>📅</Text>
          <AppText variant="body" color="primary" style={styles.bookButtonText}>
            Đặt lịch với xe này
          </AppText>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
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
  editButton: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  vehicleCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  vehicleIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  vehicleEmoji: {
    fontSize: 48,
  },
  licensePlate: {
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  defaultBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  defaultText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
  detailsCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 24,
  },
  detailContent: {
    flex: 1,
  },
  actionsCard: {
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  bookingCard: {
    marginBottom: spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  bookButtonIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  bookButtonText: {
    flex: 1,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: colors.primary,
  },
});

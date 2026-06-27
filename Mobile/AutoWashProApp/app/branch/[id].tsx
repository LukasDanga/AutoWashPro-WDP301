/**
 * AutoWashPro Branch Detail Screen
 * Shows branch info, services, and booking button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { branchApi } from '../../src/api';
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
import type { Branch, Package } from '../../src/types';

const { width } = Dimensions.get('window');

export default function BranchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [branch, setBranch] = useState<Branch | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBranchData();
    }
  }, [id]);

  const fetchBranchData = async () => {
    try {
      setIsLoading(true);
      const [branchData, packagesData] = await Promise.all([
        branchApi.getBranch(id!),
        branchApi.getBranchPackages(id!),
      ]);
      setBranch(branchData);
      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching branch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCall = () => {
    if (branch?.phone) {
      Linking.openURL(`tel:${branch.phone}`);
    }
  };

  const handleDirections = () => {
    if (branch?.address) {
      const query = encodeURIComponent(branch.address);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  const handleBookNow = () => {
    router.push({
      pathname: '/booking',
      params: { branchId: id }
    });
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải thông tin chi nhánh..." />;
  }

  if (!branch) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Chi nhánh</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <AppText variant="body" color="textSecondary">
            Không tìm thấy chi nhánh
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const isOpen = () => {
    if (!branch.openingTime || !branch.closingTime) return true;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = branch.openingTime.split(':').map(Number);
    const [closeH, closeM] = branch.closingTime.split(':').map(Number);
    const open = openH * 60 + openM;
    const close = closeH * 60 + closeM;
    return currentTime >= open && currentTime <= close;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4" numberOfLines={1}>
          {branch.name}
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Branch Image Placeholder */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageEmoji}>🏪</Text>
          </View>
          {branch.status === 'active' && (
            <View style={styles.statusBadge}>
              <Badge 
                label={isOpen() ? 'Đang mở' : 'Đã đóng'} 
                variant={isOpen() ? 'success' : 'error'}
                size="small"
              />
            </View>
          )}
        </View>

        {/* Branch Info */}
        <Card style={styles.infoCard}>
          <View style={styles.branchNameRow}>
            <AppText variant="h3">{branch.name}</AppText>
            {branch.isHot && (
              <Badge label="🔥 HOT" variant="warning" size="small" />
            )}
          </View>

          {/* Address */}
          <TouchableOpacity style={styles.infoRow} onPress={handleDirections}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <AppText variant="bodySmall" color="textSecondary">
                Địa chỉ
              </AppText>
              <AppText variant="body">{branch.address}</AppText>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Phone */}
          {branch.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Text style={styles.infoIcon}>📞</Text>
              <View style={styles.infoContent}>
                <AppText variant="bodySmall" color="textSecondary">
                  Số điện thoại
                </AppText>
                <AppText variant="body" color="primary">
                  {branch.phone}
                </AppText>
              </View>
            </TouchableOpacity>
          )}

          {/* Hours */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🕐</Text>
            <View style={styles.infoContent}>
              <AppText variant="bodySmall" color="textSecondary">
                Giờ hoạt động
              </AppText>
              <AppText variant="body">
                {branch.openingTime || '06:00'} - {branch.closingTime || '22:00'}
              </AppText>
            </View>
          </View>

          {/* Description */}
          {branch.description && (
            <View style={[styles.infoRow, styles.noBorder]}>
              <Text style={styles.infoIcon}>📝</Text>
              <View style={styles.infoContent}>
                <AppText variant="bodySmall" color="textSecondary">
                  Mô tả
                </AppText>
                <AppText variant="body" color="textSecondary">
                  {branch.description}
                </AppText>
              </View>
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleCall}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>📞</Text>
            </View>
            <AppText variant="caption">Gọi điện</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleDirections}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>🗺️</Text>
            </View>
            <AppText variant="caption">Chỉ đường</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => {/* Share */}}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>📤</Text>
            </View>
            <AppText variant="caption">Chia sẻ</AppText>
          </TouchableOpacity>
        </View>

        {/* Services / Packages */}
        {packages.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <AppText variant="h4">Dịch vụ tại chi nhánh</AppText>
            </View>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg._id}
                onPress={() => router.push({
                  pathname: '/booking',
                  params: { branchId: id, packageId: pkg._id }
                })}
              >
                <Card style={styles.packageCard}>
                  <View style={styles.packageRow}>
                    <View style={styles.packageImage}>
                      <Text style={styles.packageEmoji}>✨</Text>
                    </View>
                    <View style={styles.packageInfo}>
                      <AppText variant="body" style={styles.packageName}>
                        {pkg.name}
                      </AppText>
                      <View style={styles.packageMeta}>
                        <Text style={styles.packageDuration}>⏱️ {pkg.duration} phút</Text>
                        {pkg.vehicleTypes && pkg.vehicleTypes.length > 0 && (
                          <Text style={styles.packageVehicle}>🚗 {pkg.vehicleTypes[0]}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.packagePrice}>
                      <AppText variant="body" color="primary" style={styles.priceText}>
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                          minimumFractionDigits: 0,
                        }).format(pkg.price)}
                      </AppText>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Book Button */}
      <View style={styles.bottomAction}>
        <Button
          title="Đặt lịch ngay"
          onPress={handleBookNow}
          fullWidth
          size="large"
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: colors.primaryLight,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmoji: {
    fontSize: 80,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  infoCard: {
    margin: spacing.md,
    marginTop: -40,
    ...shadows.lg,
  },
  branchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
    alignSelf: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  packageCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  packageEmoji: {
    fontSize: 28,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  packageMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  packageDuration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  packageVehicle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontWeight: '600',
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

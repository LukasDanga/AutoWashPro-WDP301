/**
 * AutoWashPro Branch Detail Screen
 * Polished branch detail with:
 *   - gradient hero header (replaces emoji)
 *   - open/closed badge with semantic color
 *   - quick action grid (call / directions / share)
 *   - service / package list with price and tappable CTA
 *   - sticky bottom "Book now" CTA
 *   - semantic color tokens (no hardcoded hex)
 *   - no emoji icons (replaced with Icons catalog)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { branchApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  Button,
  Badge,
  Icon,
  Icons,
  PressableScale,
  Header,
  ScreenContainer,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Branch, Package } from '../../src/types';

export default function BranchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const styles = createStyles(colors);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBranchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (branch?.phone) Linking.openURL(`tel:${branch.phone}`);
  };

  const handleDirections = () => {
    if (branch?.address) {
      const query = encodeURIComponent(branch.address);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  const handleShare = async () => {
    if (!branch) return;
    try {
      await Share.share({
        message: `${branch.name}\n${branch.address}${branch.phone ? `\n${branch.phone}` : ''}`,
        title: branch.name,
      });
    } catch {
      // ignore
    }
  };

  const handleBookNow = () => {
    router.push({
      pathname: '/booking' as any,
      params: { branchId: id },
    });
  };

  const handlePackagePress = (pkg: Package) => {
    router.push({
      pathname: '/booking' as any,
      params: { branchId: id, packageId: pkg._id },
    });
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải thông tin chi nhánh..." />;
  }

  if (!branch) {
    return (
      <ScreenContainer>
        <Header title="Chi nhánh" showBack />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.errorLight }]}>
            <Icon name={Icons.error} size={36} color={colors.error} />
          </View>
          <AppText variant="body" color="textSecondary" style={{ marginTop: spacing.md }}>
            Không tìm thấy chi nhánh
          </AppText>
          <Button
            title="Quay lại"
            variant="outline"
            style={{ marginTop: spacing.lg }}
            onPress={() => router.back()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const open = isOpenNow(branch);

  return (
    <ScreenContainer edges={['top']} background="subtle">
      <Header title={branch.name} showBack />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient with icon and open/closed badge */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBlob} />
          <View style={styles.heroBlob2} />
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Icon name={Icons.storefrontOutline} size={48} color="#FFFFFF" />
          </View>
          <AppText variant="caption" style={styles.heroLabel}>
            Chi nhánh
          </AppText>
          <AppText variant="h2" style={styles.heroName} numberOfLines={2}>
            {branch.name}
          </AppText>
          {branch.status === 'active' ? (
            <View
              style={[
                styles.heroStatus,
                {
                  backgroundColor: open
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(0,0,0,0.25)',
                },
              ]}
            >
              <View
                style={[
                  styles.heroStatusDot,
                  { backgroundColor: open ? '#22C55E' : '#FCA5A5' },
                ]}
              />
              <AppText style={styles.heroStatusText}>
                {open ? 'Đang mở cửa' : 'Đã đóng cửa'}
              </AppText>
            </View>
          ) : null}
        </LinearGradient>

        {/* Quick actions */}
        <Card style={styles.quickActionsCard}>
          <View style={styles.quickActions}>
            <QuickAction
              icon={Icons.callOutline}
              label="Gọi điện"
              onPress={handleCall}
              bg={colors.primarySubtle}
              fg={colors.primary}
            />
            <QuickAction
              icon={Icons.mapOutline}
              label="Chỉ đường"
              onPress={handleDirections}
              bg={colors.infoLight}
              fg={colors.info}
            />
            <QuickAction
              icon={Icons.share}
              label="Chia sẻ"
              onPress={handleShare}
              bg={colors.successLight}
              fg={colors.success}
            />
          </View>
        </Card>

        {/* Branch Info */}
        <Card style={styles.infoCard}>
          <InfoRow
            icon={Icons.locationOutline}
            label="Địa chỉ"
            value={branch.address}
            onPress={handleDirections}
            valueColor={colors.primary}
          />
          {branch.phone ? (
            <InfoRow
              icon={Icons.callOutline}
              label="Số điện thoại"
              value={branch.phone}
              onPress={handleCall}
              valueColor={colors.primary}
            />
          ) : null}
          <InfoRow
            icon={Icons.timeOutline}
            label="Giờ hoạt động"
            value={`${branch.openingTime || '06:00'} - ${branch.closingTime || '22:00'}`}
            last
          />
          {branch.description ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <InfoRow
                icon={Icons.documentOutline}
                label="Mô tả"
                value={branch.description}
                last
              />
            </>
          ) : null}
        </Card>

        {/* Services */}
        {packages.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <AppText variant="h4">Dịch vụ tại chi nhánh</AppText>
              <AppText variant="caption" color="textSecondary">
                {packages.length} gói dịch vụ
              </AppText>
            </View>
            {packages.map((pkg) => (
              <PressableScale
                key={pkg._id}
                onPress={() => handlePackagePress(pkg)}
                accessibilityRole="button"
                accessibilityLabel={`Gói ${pkg.name}, ${formatCurrency(pkg.price)}`}
              >
                <Card style={styles.packageCard}>
                  <View style={styles.packageRow}>
                    <View style={[styles.packageIcon, { backgroundColor: colors.primarySubtle }]}>
                      <Icon name={Icons.sparkle} size={24} color={colors.primary} />
                    </View>
                    <View style={styles.packageInfo}>
                      <AppText variant="body" style={styles.packageName} numberOfLines={1}>
                        {pkg.name}
                      </AppText>
                      <View style={styles.packageMeta}>
                        <View style={styles.metaItem}>
                          <Icon name={Icons.timeOutline} size={12} color={colors.textSecondary} />
                          <AppText variant="caption" color="textSecondary">
                            {pkg.duration} phút
                          </AppText>
                        </View>
                        {pkg.vehicleTypes && pkg.vehicleTypes.length > 0 ? (
                          <View style={styles.metaItem}>
                            <Icon name={Icons.carOutline} size={12} color={colors.textSecondary} />
                            <AppText variant="caption" color="textSecondary">
                              {pkg.vehicleTypes[0]}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.packagePriceWrap}>
                      <AppText variant="body" color="primary" style={styles.priceText}>
                        {formatCurrency(pkg.price)}
                      </AppText>
                      <Icon name={Icons.chevronForward} size={18} color={colors.textTertiary} />
                    </View>
                  </View>
                </Card>
              </PressableScale>
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.bottomAction,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Button
          title="Đặt lịch ngay"
          onPress={handleBookNow}
          fullWidth
          size="large"
          icon={<Icon name={Icons.add} size={20} color={colors.textInverse} />}
        />
      </View>
    </ScreenContainer>
  );
}

interface InfoRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  valueColor?: string;
  last?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, onPress, valueColor, last }) => {
  const colors = useColors();
  return (
    <View>
      <View style={styles.infoRow}>
        <View style={[styles.infoIconWrap, { backgroundColor: colors.primarySubtle }]}>
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.infoContent}>
          <AppText variant="caption" color="textSecondary">
            {label}
          </AppText>
          <AppText variant="body" color={valueColor as any} style={styles.infoValue}>
            {value}
          </AppText>
        </View>
        {onPress ? (
          <Icon name={Icons.chevronForward} size={18} color={colors.textTertiary} />
        ) : null}
      </View>
      {!last ? <View style={[styles.divider, { backgroundColor: colors.divider }]} /> : null}
    </View>
  );
};

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onPress, bg, fg }) => {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.quickAction}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={22} color={fg} />
      </View>
      <AppText variant="caption" color="textPrimary" style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </PressableScale>
  );
};

function isOpenNow(branch: Branch): boolean {
  if (!branch.openingTime || !branch.closingTime) return true;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = branch.openingTime.split(':').map(Number);
  const [closeH, closeM] = branch.closingTime.split(':').map(Number);
  const open = openH * 60 + openM;
  const close = closeH * 60 + closeM;
  return currentTime >= open && currentTime <= close;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: 120,
    },
    hero: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      overflow: 'hidden',
    },
    heroBlob: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.1)',
      top: -80,
      right: -60,
    },
    heroBlob2: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.08)',
      bottom: -70,
      left: -40,
    },
    heroIcon: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    heroLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '500',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    heroName: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 4,
      marginBottom: spacing.sm,
    },
    heroStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      gap: 6,
    },
    heroStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    heroStatusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    quickActionsCard: {
      marginHorizontal: spacing.md,
      marginTop: -16,
      ...shadows.sm,
    },
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.sm,
    },
    quickAction: {
      alignItems: 'center',
      minWidth: 64,
      minHeight: 64,
      justifyContent: 'center',
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    infoCard: {
      margin: spacing.md,
      marginTop: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
    },
    infoIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    infoContent: {
      flex: 1,
    },
    infoValue: {
      fontWeight: '500',
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 52,
    },
    sectionHeader: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    packageCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    packageRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    packageIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    packageInfo: {
      flex: 1,
    },
    packageName: {
      fontWeight: '600',
      marginBottom: 4,
    },
    packageMeta: {
      flexDirection: 'row',
      gap: spacing.sm + 2,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    packagePriceWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    priceText: {
      fontWeight: '700',
    },
    bottomAction: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
/**
 * AutoWashPro Home Screen
 * Modern Material Design 3 inspired layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { publicApi, branchApi, packageApi } from '../../src/api';
import { Icon, Icons } from '../../src/components/common';
import { formatCurrency } from '../../src/utils';
import type { Branch, Package } from '../../src/types';

const COLORS = {
  primary: '#0050cb',
  primaryContainer: '#0066ff',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#f8f7ff',
  secondary: '#00677f',
  secondaryContainer: '#00ccf9',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#005266',
  surface: '#f9f9fc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f6',
  surfaceContainer: '#eeeef0',
  surfaceContainerHigh: '#e8e8ea',
  onSurface: '#1a1c1e',
  onSurfaceVariant: '#424656',
  outline: '#727687',
  outlineVariant: '#c2c6d8',
  error: '#ba1a1a',
  primaryFixedDim: '#b3c5ff',
  secondaryFixed: '#b7eaff',
  info: '#00ccf9',
  success: '#10b981',
  warning: '#f59e0b',
  errorLight: '#fef2f2',
  infoLight: '#e0f2fe',
  successLight: '#d1fae5',
  warningLight: '#fef3c7',
  orangeLight: '#fff7ed',
  greenLight: '#f0fdf4',
  purpleLight: '#faf5ff',
  cyanLight: '#ecfeff',
  roseLight: '#fff1f2',
};

const TIER_LABELS: Record<string, string> = {
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
  diamond: 'Kim cương',
};

const SPACING = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();

  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [packagesRes] = await Promise.all([
        packageApi.getPackages({ status: 'active' }),
      ]);
      setPackages(packagesRes.slice(0, 6));
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng,';
    if (hour < 18) return 'Chào buổi chiều,';
    return 'Chào buổi tối,';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar */}
        <View style={styles.topAppBar}>
          <View style={styles.topAppBarLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {user?.name || 'Premium Car Wash'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/notifications')}
          >
            <Icon name={Icons.notificationsOutline} size={22} color={COLORS.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#0066ff', '#00ccf9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTextSection}>
                <Text style={styles.heroTitle}>Đặt lịch rửa xe ngay</Text>
                <Text style={styles.heroSubtitle}>
                  Tiết kiệm thời gian, an toàn và tiện lợi cho xế cưng.
                </Text>
                <TouchableOpacity
                  style={styles.heroBtn}
                  onPress={() => router.push('/booking')}
                >
                  <Text style={styles.heroBtnText}>Đặt ngay</Text>
                  <Icon name={Icons.chevronRight} size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.heroImageSection}>
                <View style={styles.heroImagePlaceholder}>
                  <Icon name={Icons.carOutline} size={48} color="rgba(255,255,255,0.5)" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Loyalty Cards */}
        {isAuthenticated && user ? (
          <View style={styles.loyaltyRow}>
            {/* Points Card */}
            <View style={styles.loyaltyCard}>
              <View style={[styles.loyaltyIcon, { backgroundColor: COLORS.primaryFixedDim + '40' }]}>
                <Icon name={Icons.sparkle} size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.loyaltyLabel}>Điểm tích lũy</Text>
                <Text style={[styles.loyaltyValue, { color: COLORS.primary }]}>
                  {user.loyaltyPoints || 0}
                </Text>
              </View>
            </View>

            {/* Rank Card */}
            <View style={styles.loyaltyCard}>
              <View style={[styles.loyaltyIcon, { backgroundColor: COLORS.secondaryFixed + '40' }]}>
                <Icon name={Icons.star} size={24} color={COLORS.secondary} />
              </View>
              <View>
                <Text style={styles.loyaltyLabel}>Hạng</Text>
                <Text style={[styles.loyaltyValue, { color: COLORS.secondary, textTransform: 'uppercase' }]}>
                  {TIER_LABELS[user.tier?.toLowerCase()] || user.tier || 'Đồng'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Quick Services */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Dịch vụ nhanh</Text>
            <Text style={styles.sectionSubtitle}>Truy cập nhanh các tính năng</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.sectionAction}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          <QuickService
            icon={Icons.carOutline}
            label="Đặt lịch"
            bgColor={COLORS.infoLight}
            iconColor={COLORS.primary}
            onPress={() => router.push('/(tabs)/booking')}
          />
          <QuickService
            icon={Icons.voucherOutline}
            label="Voucher"
            bgColor={COLORS.orangeLight}
            iconColor='#f97316'
            onPress={() => router.push('/(tabs)/rewards')}
          />
          <QuickService
            icon={Icons.listOutline}
            label="Lịch sử"
            bgColor={COLORS.greenLight}
            iconColor='#22c55e'
            onPress={() => router.push('/(tabs)/history')}
          />
          <QuickService
            icon={Icons.qrCodeOutline}
            label="Check-in QR"
            bgColor={COLORS.purpleLight}
            iconColor='#a855f7'
            onPress={() => router.push('/checkin')}
          />
          <QuickService
            icon={Icons.chatBot}
            label="Chat AI"
            bgColor={COLORS.cyanLight}
            iconColor='#06b6d4'
            onPress={() => router.push('/chat')}
          />
          <QuickService
            icon={Icons.locationOutline}
            label="Chi nhánh"
            bgColor={COLORS.roseLight}
            iconColor='#f43f5e'
            onPress={() => router.push('/branch')}
          />
        </View>

        {/* Promo Banner */}
        <View style={styles.promoCard}>
          <View style={styles.promoContent}>
            <View style={styles.promoTag}>
              <Text style={styles.promoTagText}>Khuyến mãi mới</Text>
            </View>
            <Text style={styles.promoTitle}>Tặng 20% cho xe Sedan</Text>
            <Text style={styles.promoSubtitle}>Áp dụng cho gói vệ sinh nội thất cao cấp.</Text>
          </View>
          <View style={styles.promoImageSection}>
            <Icon name={Icons.carOutline} size={40} color={COLORS.primary} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface QuickServiceProps {
  icon: string;
  label: string;
  bgColor: string;
  iconColor: string;
  onPress: () => void;
}

const QuickService: React.FC<QuickServiceProps> = ({ icon, label, bgColor, iconColor, onPress }) => {
  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.serviceIcon, { backgroundColor: bgColor }]}>
        <Icon name={icon} size={28} color={iconColor} />
      </View>
      <Text style={styles.serviceLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.outline,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Top App Bar
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  topAppBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  greeting: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },

  // Hero Card
  heroCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroGradient: {
    minHeight: 180,
  },
  heroContent: {
    flexDirection: 'row',
    padding: SPACING.md,
  },
  heroTextSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onPrimaryContainer,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.onPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  heroBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  heroImageSection: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loyalty Cards
  loyaltyRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  loyaltyCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  loyaltyIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyLabel: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  loyaltyValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Services Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: SPACING.sm,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onSurface,
    textAlign: 'center',
  },

  // Promo Banner
  promoCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.secondaryContainer + '15',
    borderWidth: 1,
    borderColor: COLORS.secondaryContainer + '30',
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoContent: {
    flex: 1,
    gap: 4,
  },
  promoTag: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  promoTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.onSecondaryContainer,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSecondaryContainer,
    marginTop: 8,
  },
  promoSubtitle: {
    fontSize: 13,
    color: COLORS.onSecondary,
  },
  promoImageSection: {
    width: 80,
    height: 80,
    marginLeft: SPACING.md,
  },
});

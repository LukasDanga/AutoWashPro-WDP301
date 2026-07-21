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
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { publicApi, branchApi, packageApi } from '../../src/api';
import { Icon, Icons } from '../../src/components/common';
import { formatCurrency } from '../../src/utils';
import { getTierTheme } from '../../src/utils/tierHelper';
import { shadows, layout } from '../../src/theme/spacing';
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

const SPACING = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

// ─── Loyalty Card — Premium tier-aware pill ─────────────────────────────────────
interface LoyaltyCardProps {
  icon: string;
  label: string;
  value: string;
  textColor: string;
  iconBgColor: string;
  borderColor: string;
  gradientHint: string;
  accentBg: string;
  onPress?: () => void;
}

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  icon, label, value, textColor, iconBgColor, borderColor, gradientHint, accentBg, onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.loyaltyCard, { borderColor }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <LinearGradient
        colors={['#FFFFFF', gradientHint] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loyaltyGradient}
      >
        {/* Decorative accent blob for depth */}
        <View style={[styles.loyaltyBlob, { backgroundColor: accentBg }]} />

        {/* Tier-tinted icon container */}
        <View style={[styles.loyaltyIcon, { backgroundColor: iconBgColor }]}>
          <Icon name={icon as any} size={26} color={textColor} />
        </View>

        {/* Text column */}
        <View style={styles.loyaltyTextCol}>
          <Text style={styles.loyaltyLabel} numberOfLines={1}>{label}</Text>
          <Text
            style={[styles.loyaltyValue, { color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();

  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const checkPending = async () => {
        try {
          const [extras, recurring] = await Promise.all([
            AsyncStorage.getItem('aw_checkout_extras'),
            AsyncStorage.getItem('aw_recurring_draft')
          ]);
          if (cancelled) return;
          if (recurring) {
            setPendingCheckoutUrl('/payment/checkout?type=recurring');
          } else if (extras) {
            setPendingCheckoutUrl('/payment/checkout');
          } else {
            setPendingCheckoutUrl(null);
          }
        } catch (e) {}
      };
      checkPending();
      return () => { cancelled = true; };
    }, [])
  );

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

  // Tier-aware theme — drives color, icon, and gradient for the rank card so
  // Bronze renders in copper, Silver in slate, Gold in royal gold, Diamond in cyan.
  const tierTheme = getTierTheme(user?.tier);

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

        {/* Pending Checkout Banner */}
        {pendingCheckoutUrl && (
          <TouchableOpacity 
            style={[styles.promoCard, { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning, marginTop: SPACING.sm, marginBottom: 0 }]}
            onPress={() => router.push(pendingCheckoutUrl as any)}
            activeOpacity={0.8}
          >
            <View style={styles.promoContent}>
              <View style={[styles.promoTag, { backgroundColor: COLORS.warning }]}>
                <Text style={[styles.promoTagText, { color: '#000' }]}>Chưa hoàn tất</Text>
              </View>
              <Text style={[styles.promoTitle, { color: COLORS.onSurface }]}>Tiếp tục thanh toán 💳</Text>
              <Text style={[styles.promoSubtitle, { color: COLORS.onSurfaceVariant }]}>Bạn có một giao dịch thanh toán đang dở dang.</Text>
            </View>
            <Icon name={Icons.chevronRight} size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
        )}

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#0050cb', '#0ea5e9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.2 }}
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

        {/* Loyalty Cards — Premium tier-aware design */}
        {isAuthenticated && user ? (
          <View style={styles.loyaltyRow}>
            <LoyaltyCard
              icon={Icons.sparkle}
              label="ĐIỂM TÍCH LŨY"
              value={(user.loyaltyPoints || 0).toLocaleString('vi-VN')}
              textColor={COLORS.primary}
              iconBgColor={`${COLORS.primary}1A`}
              borderColor={`${COLORS.primary}33`}
              gradientHint="#EFF6FF"
              accentBg={`${COLORS.primary}10`}
              onPress={() => router.push('/(tabs)/rewards' as any)}
            />
            <LoyaltyCard
              icon={tierTheme.iconName as any}
              label="HẠNG THÀNH VIÊN"
              value={tierTheme.label}
              textColor={tierTheme.textColor}
              iconBgColor={`${tierTheme.textColor}1A`}
              borderColor={tierTheme.borderColor}
              gradientHint={tierTheme.bgColor}
              accentBg={`${tierTheme.textColor}10`}
              onPress={() => router.push('/(tabs)/rewards' as any)}
            />
          </View>
        ) : null}

        {/* Quick Services */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Dịch vụ nhanh</Text>
            <Text style={styles.sectionSubtitle}>Truy cập nhanh các tính năng</Text>
          </View>
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
  // Derive a slightly darker tint for the gradient hint and a very subtle
  // border that picks up the icon color, mirroring the loyalty card pattern.
  const tintedBorder = `${iconColor}33`;
  const blobBg = `${iconColor}12`;

  return (
    <TouchableOpacity
      style={[styles.serviceCard, { borderColor: tintedBorder }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={['#FFFFFF', bgColor] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.serviceGradient}
      >
        {/* Decorative accent blob for depth */}
        <View style={[styles.serviceBlob, { backgroundColor: blobBg }]} />

        {/* Icon container with tinted background */}
        <View style={[styles.serviceIcon, { backgroundColor: `${iconColor}1A` }]}>
          <Icon name={icon as any} size={26} color={iconColor} />
        </View>

        <Text style={styles.serviceLabel}>{label}</Text>
      </LinearGradient>
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
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
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
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    ...shadows.md,
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
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    color: COLORS.onPrimaryContainer,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
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
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
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
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.md,
  },
  loyaltyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  loyaltyBlob: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -28,
    right: -28,
  },
  loyaltyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyTextCol: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  loyaltyLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  loyaltyValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    marginTop: 2,
    letterSpacing: 0.2,
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
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: COLORS.onSurface,
  },
  sectionSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  sectionAction: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
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
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...shadows.md,
  },
  serviceGradient: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceBlob: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    top: -24,
    right: -22,
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: COLORS.onSurface,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Promo Banner
  promoCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.secondaryContainer + '15',
    borderWidth: 1,
    borderColor: COLORS.secondaryContainer + '30',
    borderRadius: layout.cardRadius,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
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
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: COLORS.onSecondaryContainer,
  },
  promoTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: COLORS.onSecondaryContainer,
    marginTop: 8,
  },
  promoSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    // Default sits on the light cyan promoCard tint; onSurfaceVariant (#424656)
    // gives a clean WCAG-AA contrast instead of washing out like onSecondary white.
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  promoImageSection: {
    width: 80,
    height: 80,
    marginLeft: SPACING.md,
  },
});

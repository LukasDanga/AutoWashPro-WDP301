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
import { useColors } from '../../src/theme/ThemeContext';
import { Text as AppText } from '../../src/components/common';
import type { Branch, Package } from '../../src/types';



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
          <AppText variant="labelSmall" style={styles.loyaltyLabel} numberOfLines={1}>{label}</AppText>
          <AppText
            variant="h3"
            style={[styles.loyaltyValue, { color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </AppText>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const colors = useColors();

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
          const [extrasStr, recurringStr] = await Promise.all([
            AsyncStorage.getItem('aw_checkout_extras'),
            AsyncStorage.getItem('aw_recurring_draft')
          ]);
          if (cancelled) return;

          const now = Date.now();
          const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

          let hasRecurring = false;
          let hasExtras = false;

          if (recurringStr) {
            const parsed = JSON.parse(recurringStr);
            if (!parsed.timestamp || (now - parsed.timestamp > EXPIRY_MS)) {
              await AsyncStorage.removeItem('aw_recurring_draft');
            } else {
              hasRecurring = true;
            }
          }

          if (extrasStr) {
            const parsed = JSON.parse(extrasStr);
            if (!parsed.timestamp || (now - parsed.timestamp > EXPIRY_MS)) {
              await AsyncStorage.removeItem('aw_checkout_extras');
            } else {
              hasExtras = true;
            }
          }

          if (hasRecurring) {
            setPendingCheckoutUrl('/payment/checkout?type=recurring');
          } else if (hasExtras) {
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
            colors={[colors.primary]}
            tintColor={colors.primary}
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
              <AppText variant="labelSmall" color="textSecondary">{getGreeting()}</AppText>
              <AppText variant="h3" color="primary">
                {user?.name || 'Premium Car Wash'}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/notifications')}
          >
            <Icon name={Icons.notificationsOutline} size={22} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <AppText style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Pending Checkout Banner */}
        {pendingCheckoutUrl && (
          <TouchableOpacity 
            style={[styles.promoCard, { backgroundColor: colors.warningLight, borderColor: colors.warning, marginTop: SPACING.sm, marginBottom: 0 }]}
            onPress={() => router.push(pendingCheckoutUrl as any)}
            activeOpacity={0.8}
          >
            <View style={styles.promoContent}>
              <View style={[styles.promoTag, { backgroundColor: colors.warning }]}>
                <AppText style={[styles.promoTagText, { color: '#000' }]}>Chưa hoàn tất</AppText>
              </View>
              <AppText variant="h4" style={{ color: colors.textPrimary, marginTop: 8 }}>Tiếp tục thanh toán 💳</AppText>
              <AppText variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>Bạn có một giao dịch thanh toán đang dở dang.</AppText>
            </View>
            <Icon name={Icons.chevronRight} size={24} color={colors.textPrimary} />
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
                <AppText variant="h2" style={styles.heroTitle}>Đặt lịch rửa xe ngay</AppText>
                <AppText variant="bodySmall" style={styles.heroSubtitle}>
                  Tiết kiệm thời gian, an toàn và tiện lợi cho xế cưng.
                </AppText>
                <TouchableOpacity
                  style={styles.heroBtn}
                  onPress={() => router.push('/booking')}
                >
                  <AppText variant="button" style={{ color: colors.primary }}>Đặt ngay</AppText>
                  <Icon name={Icons.chevronRight} size={18} color={colors.primary} />
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
              textColor={colors.primary}
              iconBgColor={`${colors.primary}1A`}
              borderColor={`${colors.primary}33`}
              gradientHint={colors.primaryLight}
              accentBg={`${colors.primary}10`}
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
            <AppText variant="h3" color="textPrimary">Dịch vụ nhanh</AppText>
            <AppText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>Truy cập nhanh các tính năng</AppText>
          </View>
        </View>

        <View style={styles.servicesGrid}>
          <QuickService
            icon={Icons.carOutline}
            label="Đặt lịch"
            bgColor={colors.infoLight}
            iconColor={colors.primary}
            onPress={() => router.push('/(tabs)/booking')}
          />
          <QuickService
            icon={Icons.voucherOutline}
            label="Voucher"
            bgColor={colors.warningLight}
            iconColor={colors.warning}
            onPress={() => router.push('/(tabs)/rewards')}
          />
          <QuickService
            icon={Icons.listOutline}
            label="Lịch sử"
            bgColor={colors.successLight}
            iconColor={colors.success}
            onPress={() => router.push('/(tabs)/history')}
          />
          <QuickService
            icon={Icons.qrCodeOutline}
            label="Check-in QR"
            bgColor={colors.infoLight}
            iconColor={colors.info}
            onPress={() => router.push('/checkin')}
          />
          <QuickService
            icon={Icons.chatBot}
            label="Chat AI"
            bgColor={colors.primaryLight}
            iconColor={colors.primary}
            onPress={() => router.push('/chat')}
          />
          <QuickService
            icon={Icons.locationOutline}
            label="Chi nhánh"
            bgColor={colors.errorLight}
            iconColor={colors.error}
            onPress={() => router.push('/branch')}
          />
        </View>

        {/* Promo Banner */}
        <View style={[styles.promoCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primaryLight }]}>
          <View style={styles.promoContent}>
            <View style={[styles.promoTag, { backgroundColor: colors.primary }]}>
              <AppText style={[styles.promoTagText, { color: colors.textInverse }]}>Khuyến mãi mới</AppText>
            </View>
            <AppText variant="h4" color="primary" style={{ marginTop: 8 }}>Tặng 20% cho xe Sedan</AppText>
            <AppText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>Áp dụng cho gói vệ sinh nội thất cao cấp.</AppText>
          </View>
          <View style={styles.promoImageSection}>
            <Icon name={Icons.carOutline} size={40} color={colors.primary} />
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

        <AppText variant="labelSmall" style={styles.serviceLabel}>{label}</AppText>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
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
    backgroundColor: 'transparent',
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
    backgroundColor: '#0050cb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
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
    color: '#FFF',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
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
    color: '#64748B',
  },
  loyaltyValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
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
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Promo Banner
  promoCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  promoTagText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
  },
  promoImageSection: {
    width: 80,
    height: 80,
    marginLeft: SPACING.md,
  },
});

/**
 * AutoWashPro Profile Screen
 * User profile, settings menu groups with gradient hero header
 * Following UX guidelines:
 *   - accessibility, no-emoji-icons, scale-feedback
 *   - visual-hierarchy (avatar → name → tier → menu groups)
 *   - destructive-nav-separation (logout separated)
 *   - group related items
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { bookingApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  TierBadge,
  Icon,
  Icons,
  PressableScale,
  Button,
  ScreenContainer,
  Loading,
  AlertDialog,
} from '../../src/components/common';
import { useTheme, useColors } from '../../src/theme/ThemeContext';
import { toGradientColors, getGradients } from '../../src/theme/gradients';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  badge?: string;
  destructive?: boolean;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  badge,
  destructive = false,
  badgeVariant = 'primary',
}) => {
  const colors = useColors();
  const styles = createMenuStyles(colors);
  const iconColor = destructive ? colors.error : colors.primary;
  const bgColor = destructive ? colors.errorLight : colors.surface;

  return (
    <PressableScale
      onPress={onPress}
      style={styles.menuItem}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityRole="button"
    >
      <View style={[styles.menuIcon, { backgroundColor: bgColor }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <AppText
          variant="body"
          style={destructive ? styles.destructiveText : undefined}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.menuBadge, badgeVariantStyle(badgeVariant, colors)]}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : null}
      {showArrow ? (
        <Icon name={Icons.forward} size={18} color={colors.textTertiary} />
      ) : null}
    </PressableScale>
  );
};

function badgeVariantStyle(variant: 'primary' | 'success' | 'warning' | 'error' | 'info', colors: any) {
  const map: Record<typeof variant, { backgroundColor: string }> = {
    primary: { backgroundColor: colors.primaryLight },
    success: { backgroundColor: colors.successLight },
    warning: { backgroundColor: colors.warningLight },
    error: { backgroundColor: colors.errorLight },
    info: { backgroundColor: colors.infoLight },
  };
  return map[variant];
}

const createMenuStyles = (colors: any) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 60,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    menuContent: {
      flex: 1,
    },
    menuBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
      minWidth: 32,
      alignItems: 'center',
    },
    menuBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    destructiveText: {
      color: colors.error,
      fontWeight: '600',
    },
  });

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark } = useTheme();
  const colors = useColors();
  const styles = createStyles(colors);
  const gradients = getGradients(isDark);

  const [bookingCount, setBookingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    bookingApi
      .getMyBookings()
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.data || [];
        setBookingCount(list.length);
      })
      .catch(() => setBookingCount(0));
  }, [isAuthenticated]);

  const handleLogout = () => {
    AlertDialog.confirm(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      () => logout(),
      undefined,
      'Đăng xuất',
      'Hủy',
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer background="gradient">
        <LinearGradient
          colors={toGradientColors(gradients.hero)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.guestHero}
        >
          <View style={[styles.heroBlob, styles.heroBlob1]} />
          <View style={[styles.heroBlob, styles.heroBlob2]} />
          <View style={styles.guestIconWrap}>
            <Icon name={Icons.personOutline} size={48} color={colors.textInverse} />
          </View>
          <Text style={styles.guestTitle}>Chào khách!</Text>
          <Text style={styles.guestSubtitle}>
            Đăng nhập để trải nghiệm đầy đủ dịch vụ
          </Text>
        </LinearGradient>

        <View style={styles.guestCTAs}>
          <Button
            title="Đăng nhập"
            onPress={() => router.push('/(auth)/login' as any)}
            fullWidth
            style={styles.guestLoginButton}
          />
          <Button
            title="Tạo tài khoản"
            variant="outline"
            onPress={() => router.push('/(auth)/register' as any)}
            fullWidth
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll background="subtle">
      {/* Gradient profile header */}
      <LinearGradient
        colors={toGradientColors(gradients.profile)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHeader}
      >
        <View style={[styles.heroBlob, styles.heroBlob1]} />
        <View style={[styles.heroBlob, styles.heroBlob2]} />

        <PressableScale
          style={styles.avatar}
onPress={() => router.push('/profile/edit' as any)}
              accessibilityRole="button"
              accessibilityLabel="Chỉnh sửa thông tin cá nhân"
        >
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </PressableScale>

        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.tierBadgeWrap}>
          <TierBadge tier={user?.tier || 'bronze'} />
        </View>
      </LinearGradient>

      {/* Stats card */}
      <View style={styles.statsWrap}>
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/history' as any)}
              style={styles.statItem}
            >
              <Text style={styles.statValue}>{bookingCount ?? '—'}</Text>
              <AppText variant="caption" color="textSecondary">
                Đơn đặt
              </AppText>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.loyaltyPoints || 0}</Text>
              <AppText variant="caption" color="textSecondary">
                Điểm
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.lifetimePoints || 0}</Text>
              <AppText variant="caption" color="textSecondary">
                Tổng điểm
              </AppText>
            </View>
          </View>
        </Card>
      </View>

      {/* Account section */}
      <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
        Tài khoản
      </AppText>
      <View style={styles.menuSection}>
        <MenuItem
          icon={Icons.personOutline}
          title="Chỉnh sửa thông tin"
          subtitle="Cập nhật họ tên, số điện thoại"
          onPress={() => router.push('/profile/edit' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.carOutline}
          title="Quản lý xe"
          subtitle="Thêm, sửa, xóa phương tiện"
          onPress={() => router.push('/vehicle' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.lockOutline}
          title="Đổi mật khẩu"
          onPress={() => router.push('/profile/change-password' as any)}
        />
      </View>

      {/* Bookings section */}
      <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
        Đặt lịch
      </AppText>
      <View style={styles.menuSection}>
        <MenuItem
          icon={Icons.listOutline}
          title="Lịch sử đặt lịch"
          onPress={() => router.push('/(tabs)/history' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.cardOutline}
          title="Lịch sử thanh toán"
          onPress={() => router.push('/payment/history' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.voucherOutline}
          title="Voucher của tôi"
          onPress={() => router.push('/(tabs)/rewards' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.cartOutline}
          title="Gói slot đã mua"
          onPress={() => router.push('/slot-packs' as any)}
        />
      </View>

      {/* Admin / Manager section */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Quản lý
          </AppText>
          <View style={styles.menuSection}>
            <MenuItem
              icon={Icons.sparkle}
              title="Dashboard"
              subtitle="Xem thống kê và báo cáo"
              onPress={() => router.push('/admin/dashboard' as any)}
              badgeVariant="primary"
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={Icons.calendarOutline}
              title="Quản lý đặt lịch"
              subtitle="Duyệt và quản lý booking"
              onPress={() => router.push('/admin/bookings' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={Icons.personOutline}
              title="Quản lý khách hàng"
              subtitle="Xem danh sách khách hàng"
              onPress={() => router.push('/admin/customers' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={Icons.locationOutline}
              title="Quản lý chi nhánh"
              subtitle="Thêm, sửa chi nhánh"
              onPress={() => router.push('/admin/branches' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={Icons.documentOutline}
              title="Quản lý dịch vụ"
              subtitle="Quản lý gói dịch vụ"
              onPress={() => router.push('/admin/packages' as any)}
            />
          </View>
        </>
      )}

      {/* Settings */}
      <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
        Cài đặt
      </AppText>
      <View style={styles.menuSection}>
        <MenuItem
          icon={Icons.notificationsOutline}
          title="Thông báo"
          subtitle="Cài đặt thông báo"
          onPress={() => router.push('/settings/notifications' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.chatOutline}
          title="Ngôn ngữ"
          subtitle="Tiếng Việt"
          onPress={() => router.push('/settings/language' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.info}
          title="Trợ giúp & Hỗ trợ"
          onPress={() => router.push('/help' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.documentOutline}
          title="Điều khoản sử dụng"
          onPress={() => router.push('/terms' as any)}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={Icons.shield}
          title="Chính sách bảo mật"
          onPress={() => router.push('/privacy' as any)}
        />
      </View>

      {/* App Info */}
      <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
        Về ứng dụng
      </AppText>
      <View style={styles.menuSection}>
        <MenuItem
          icon={Icons.info}
          title="Về AutoWashPro"
          subtitle="Phiên bản 1.0.0"
          onPress={() => router.push('/about' as any)}
          showArrow={false}
        />
      </View>

      {/* Logout - visually separated with destructive emphasis */}
      <PressableScale
        style={styles.logoutButton}
        onPress={handleLogout}
        accessibilityLabel="Đăng xuất"
        accessibilityRole="button"
      >
        <Icon name={Icons.logOutOutline} size={18} color={colors.error} style={styles.logoutIcon} />
        <AppText variant="body" color="error" style={styles.logoutText}>
          Đăng xuất
        </AppText>
      </PressableScale>
    </ScreenContainer>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.lg,
  },
  heroBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBlob1: {
    width: 200,
    height: 200,
    top: -60,
    right: -50,
  },
  heroBlob2: {
    width: 160,
    height: 160,
    bottom: -50,
    left: -30,
  },
  // Guest hero
  guestHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    overflow: 'hidden',
  },
  guestIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  guestSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  guestCTAs: {
    padding: spacing.lg,
  },
  guestLoginButton: {
    marginBottom: spacing.md,
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textInverse,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverse,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  tierBadgeWrap: {
    marginTop: spacing.sm,
  },
  // Stats
  statsWrap: {
    paddingHorizontal: spacing.md,
    marginTop: -16,
  },
  statsCard: {
    ...shadows.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  // Section
  sectionTitle: {
    marginLeft: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  menuSection: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    minHeight: 48,
  },
  logoutIcon: {
    marginRight: spacing.sm,
  },
  logoutText: {
    fontWeight: '700',
  },
  destructiveText: {
    color: colors.error,
    fontWeight: '600',
  },
});

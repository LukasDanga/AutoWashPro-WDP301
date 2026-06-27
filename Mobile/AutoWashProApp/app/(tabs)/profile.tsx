/**
 * AutoWashPro Profile Screen
 * User profile and settings
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { 
  Text as AppText, 
  Card, 
  Badge,
  TierBadge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  badge,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIcon}>
      <Text style={styles.menuEmoji}>{icon}</Text>
    </View>
    <View style={styles.menuContent}>
      <AppText variant="body">{title}</AppText>
      {subtitle && (
        <AppText variant="caption" color="textSecondary">
          {subtitle}
        </AppText>
      )}
    </View>
    {badge && (
      <Badge label={badge} variant="error" size="small" />
    )}
    {showArrow && (
      <Text style={styles.menuArrow}>›</Text>
    )}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.guestContainer}>
          <View style={styles.guestIcon}>
            <Text style={styles.guestEmoji}>👤</Text>
          </View>
          <AppText variant="h3" style={styles.guestTitle}>
            Chào khách!
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.guestSubtitle}>
            Đăng nhập để trải nghiệm đầy đủ dịch vụ
          </AppText>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <AppText variant="button" color="textInverse">
              Đăng nhập
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <AppText variant="button" color="primary">
              Tạo tài khoản
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.editAvatarIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
          <AppText variant="h3" style={styles.userName}>
            {user?.name}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {user?.email}
          </AppText>
          <View style={styles.tierBadge}>
            <TierBadge tier={user?.tier || 'bronze'} />
          </View>
        </View>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.statValue}>-</Text>
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

        {/* Account Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Tài khoản
          </AppText>
          <Card padding={0}>
            <MenuItem
              icon="👤"
              title="Chỉnh sửa thông tin"
              subtitle="Cập nhật họ tên, số điện thoại"
              onPress={() => router.push('/profile/edit')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🚗"
              title="Quản lý xe"
              subtitle="Thêm, sửa, xóa phương tiện"
              onPress={() => router.push('/vehicle')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🔐"
              title="Đổi mật khẩu"
              onPress={() => router.push('/profile/change-password')}
            />
          </Card>
        </View>

        {/* Bookings Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Đặt lịch
          </AppText>
          <Card padding={0}>
            <MenuItem
              icon="📋"
              title="Lịch sử đặt lịch"
              onPress={() => router.push('/history')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="💳"
              title="Lịch sử thanh toán"
              onPress={() => router.push('/payment' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🎟️"
              title="Voucher của tôi"
              onPress={() => router.push('/rewards?tab=my' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="📦"
              title="Gói slot đã mua"
              onPress={() => router.push('/slot-packs' as any)}
            />
          </Card>
        </View>

        {/* Admin/Manager Section */}
        {user?.role === 'admin' || user?.role === 'manager' ? (
          <>
            <View style={styles.section}>
              <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
                Quản lý
              </AppText>
              <Card padding={0}>
                <MenuItem
                  icon="📊"
                  title="Dashboard"
                  subtitle="Xem thống kê và báo cáo"
                  onPress={() => router.push('/admin/dashboard' as any)}
                />
                <View style={styles.menuDivider} />
                <MenuItem
                  icon="📅"
                  title="Quản lý đặt lịch"
                  subtitle="Duyệt và quản lý booking"
                  onPress={() => router.push('/admin/bookings' as any)}
                />
                <View style={styles.menuDivider} />
                <MenuItem
                  icon="👥"
                  title="Quản lý khách hàng"
                  subtitle="Xem danh sách khách hàng"
                  onPress={() => router.push('/admin/customers' as any)}
                />
                <View style={styles.menuDivider} />
                <MenuItem
                  icon="🏪"
                  title="Quản lý chi nhánh"
                  subtitle="Thêm, sửa chi nhánh"
                  onPress={() => router.push('/admin/branches' as any)}
                />
                <View style={styles.menuDivider} />
                <MenuItem
                  icon="📦"
                  title="Quản lý dịch vụ"
                  subtitle="Quản lý gói dịch vụ"
                  onPress={() => router.push('/admin/packages' as any)}
                />
              </Card>
            </View>
          </>
        ) : null}

        {/* Settings Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Cài đặt
          </AppText>
          <Card padding={0}>
            <MenuItem
              icon="🔔"
              title="Thông báo"
              subtitle="Cài đặt thông báo"
              onPress={() => router.push('/settings/notifications' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🌐"
              title="Ngôn ngữ"
              subtitle="Tiếng Việt"
              onPress={() => router.push('/settings/language' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="❓"
              title="Trợ giúp & Hỗ trợ"
              onPress={() => router.push('/help' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="📜"
              title="Điều khoản sử dụng"
              onPress={() => router.push('/terms' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🔒"
              title="Chính sách bảo mật"
              onPress={() => router.push('/privacy' as any)}
            />
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Card padding={0}>
            <MenuItem
              icon="ℹ️"
              title="Về AutoWashPro"
              subtitle="Phiên bản 1.0.0"
              onPress={() => router.push('/about' as any)}
              showArrow={false}
            />
          </Card>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <AppText variant="body" color="error">
            Đăng xuất
          </AppText>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  guestIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  guestEmoji: {
    fontSize: 48,
  },
  guestTitle: {
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  registerButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.textInverse,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  editAvatarIcon: {
    fontSize: 14,
  },
  userName: {
    marginBottom: spacing.xs,
  },
  tierBadge: {
    marginTop: spacing.sm,
  },
  statsCard: {
    margin: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuEmoji: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

/**
 * AutoWashPro Settings Screen
 * App settings and preferences
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { 
  Text as AppText, 
  Card,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

interface SettingToggleProps {
  icon: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIcon}>
      <Text style={styles.settingEmoji}>{icon}</Text>
    </View>
    <View style={styles.settingContent}>
      <AppText variant="body">{title}</AppText>
      {subtitle && (
        <AppText variant="caption" color="textSecondary">
          {subtitle}
        </AppText>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={value ? colors.primary : colors.textTertiary}
    />
  </View>
);

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  value?: string;
  destructive?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  value,
  destructive = false,
}) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingIcon}>
      <Text style={styles.settingEmoji}>{icon}</Text>
    </View>
    <View style={styles.settingContent}>
      <AppText variant="body" color={destructive ? 'error' : 'textPrimary'}>
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="caption" color="textSecondary">
          {subtitle}
        </AppText>
      )}
    </View>
    {value && (
      <AppText variant="bodySmall" color="textSecondary">
        {value}
      </AppText>
    )}
    {showArrow && (
      <Text style={[styles.settingArrow, destructive && styles.settingArrowDestructive]}>
        ›
      </Text>
    )}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const [settings, setSettings] = useState({
    pushNotifications: true,
    bookingReminders: true,
    promotions: true,
    sound: true,
    vibration: true,
    darkMode: false,
  });

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

  const handleClearCache = () => {
    Alert.alert(
      'Xóa bộ nhớ đệm',
      'Điều này sẽ xóa tất cả dữ liệu tạm thời. Bạn cần đăng nhập lại.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Thành công', 'Đã xóa bộ nhớ đệm');
          },
        },
      ]
    );
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Cài đặt</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Thông báo
          </AppText>
          <Card padding={0}>
            <SettingToggle
              icon="🔔"
              title="Thông báo đẩy"
              subtitle="Nhận thông báo từ ứng dụng"
              value={settings.pushNotifications}
              onValueChange={(v) => updateSetting('pushNotifications', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              icon="⏰"
              title="Nhắc nhở đặt lịch"
              subtitle="Thông báo trước 1 giờ"
              value={settings.bookingReminders}
              onValueChange={(v) => updateSetting('bookingReminders', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              icon="🎉"
              title="Khuyến mãi"
              subtitle="Nhận thông báo khuyến mãi"
              value={settings.promotions}
              onValueChange={(v) => updateSetting('promotions', v)}
            />
          </Card>
        </View>

        {/* Sound & Haptics Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Âm thanh & Rung
          </AppText>
          <Card padding={0}>
            <SettingToggle
              icon="🔊"
              title="Âm thanh"
              subtitle="Phát âm thanh khi có thông báo"
              value={settings.sound}
              onValueChange={(v) => updateSetting('sound', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              icon="📳"
              title="Rung"
              subtitle="Rung khi có thông báo"
              value={settings.vibration}
              onValueChange={(v) => updateSetting('vibration', v)}
            />
          </Card>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Hiển thị
          </AppText>
          <Card padding={0}>
            <SettingItem
              icon="🌐"
              title="Ngôn ngữ"
              value="Tiếng Việt"
              onPress={() => router.push('/settings/language' as any)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🌙"
              title="Chế độ tối"
              subtitle="Chưa khả dụng"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang được phát triển')}
            />
          </Card>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Tài khoản
          </AppText>
          <Card padding={0}>
            <SettingItem
              icon="🔐"
              title="Đổi mật khẩu"
              onPress={() => router.push('/profile/change-password' as any)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📱"
              title="Đổi số điện thoại"
              onPress={() => router.push('/profile/change-phone' as any)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📧"
              title="Đổi email"
              onPress={() => router.push('/profile/change-email' as any)}
            />
          </Card>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Dữ liệu
          </AppText>
          <Card padding={0}>
            <SettingItem
              icon="🗑️"
              title="Xóa bộ nhớ đệm"
              subtitle="Giải phóng dung lượng"
              onPress={handleClearCache}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📊"
              title="Xuất dữ liệu"
              subtitle="Tải về dữ liệu của bạn"
              onPress={() => Alert.alert('Thông báo', 'Tính năng đang được phát triển')}
            />
          </Card>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Pháp lý
          </AppText>
          <Card padding={0}>
            <SettingItem
              icon="📜"
              title="Điều khoản sử dụng"
              onPress={() => router.push('/terms' as any)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🔒"
              title="Chính sách bảo mật"
              onPress={() => router.push('/privacy' as any)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📄"
              title="Giấy phép"
              onPress={() => router.push('/licenses' as any)}
            />
          </Card>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Về ứng dụng
          </AppText>
          <Card padding={0}>
            <SettingItem
              icon="ℹ️"
              title="Phiên bản"
              value="1.0.0"
              showArrow={false}
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="⭐"
              title="Đánh giá ứng dụng"
              onPress={() => Alert.alert('Thông báo', 'Cảm ơn bạn!')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="💬"
              title="Gửi phản hồi"
              onPress={() => router.push('/feedback' as any)}
            />
          </Card>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <AppText variant="body" color="error">
              Đăng xuất
            </AppText>
          </TouchableOpacity>
        </View>

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
  section: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingEmoji: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingArrow: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  settingArrowDestructive: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  logoutIcon: {
    fontSize: 18,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

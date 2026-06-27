/**
 * AutoWashPro Notification Settings Screen
 *
 * Lets the user toggle per-category push notifications.
 *
 * Backend doesn't yet expose a per-user "notification preferences" endpoint,
 * so preferences are stored locally on-device via AsyncStorage. The bell
 * notification list itself is driven by the server and cannot be silenced
 * here — toggles only affect future client-side filtering / reminder logic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useNotifications } from '../../src/contexts/NotificationContext';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'aw_notification_prefs';

interface Prefs {
  bookingReminders: boolean;
  bookingConfirmations: boolean;
  paymentAlerts: boolean;
  promotions: boolean;
  pointsUpdates: boolean;
  systemNotifications: boolean;
}

const DEFAULT_PREFS: Prefs = {
  bookingReminders: true,
  bookingConfirmations: true,
  paymentAlerts: true,
  promotions: false,
  pointsUpdates: true,
  systemNotifications: true,
};

interface SettingToggleProps {
  title: string;
  description: string;
  icon: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  title,
  description,
  icon,
  value,
  onValueChange,
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingIcon}>
      <Text style={styles.settingEmoji}>{icon}</Text>
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <TouchableOpacity
      style={[styles.switch, value && styles.switchActive]}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.7}
    >
      <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
    </TouchableOpacity>
  </View>
);

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { unreadCount, markAllAsRead } = useNotifications();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPrefs(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.warn('Failed to load notification prefs:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const togglePref = useCallback(
    async (key: keyof Prefs) => {
      const next: Prefs = { ...prefs, [key]: !prefs[key] };
      setPrefs(next);
      try {
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save notification prefs:', err);
      }
    },
    [prefs],
  );

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    Alert.alert(
      'Đánh dấu đã đọc tất cả?',
      `${unreadCount} thông báo sẽ được đánh dấu đã đọc.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => markAllAsRead() },
      ],
    );
  };

  if (isLoading) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Text style={styles.headerAction}>Hộp thư</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick action */}
        <Card style={styles.quickActionCard}>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionIcon}>📬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Hộp thư thông báo</Text>
              <Text style={styles.quickActionSubtitle}>
                {unreadCount > 0
                  ? `Có ${unreadCount} thông báo chưa đọc`
                  : 'Bạn đã đọc hết'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={styles.openButton}
            >
              <Text style={styles.openButtonText}>Mở</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Booking Section */}
        <Text style={styles.sectionTitle}>Đặt lịch</Text>
        <Card padding={0}>
          <SettingToggle
            icon="📅"
            title="Nhắc nhở đặt lịch"
            description="Nhận thông báo trước khi đến giờ hẹn"
            value={prefs.bookingReminders}
            onValueChange={() => togglePref('bookingReminders')}
          />
          <View style={styles.divider} />
          <SettingToggle
            icon="✅"
            title="Xác nhận đặt lịch"
            description="Thông báo khi đặt lịch được xác nhận"
            value={prefs.bookingConfirmations}
            onValueChange={() => togglePref('bookingConfirmations')}
          />
        </Card>

        {/* Payment Section */}
        <Text style={styles.sectionTitle}>Thanh toán</Text>
        <Card padding={0}>
          <SettingToggle
            icon="💳"
            title="Thông báo thanh toán"
            description="Nhắc nhở thanh toán và cập nhật trạng thái"
            value={prefs.paymentAlerts}
            onValueChange={() => togglePref('paymentAlerts')}
          />
        </Card>

        {/* Rewards Section */}
        <Text style={styles.sectionTitle}>Phần thưởng</Text>
        <Card padding={0}>
          <SettingToggle
            icon="⭐"
            title="Cập nhật điểm thưởng"
            description="Thông báo khi có điểm mới"
            value={prefs.pointsUpdates}
            onValueChange={() => togglePref('pointsUpdates')}
          />
        </Card>

        {/* Marketing Section */}
        <Text style={styles.sectionTitle}>Khuyến mãi</Text>
        <Card padding={0}>
          <SettingToggle
            icon="🎁"
            title="Ưu đãi & Khuyến mãi"
            description="Nhận thông báo về voucher và khuyến mãi đặc biệt"
            value={prefs.promotions}
            onValueChange={() => togglePref('promotions')}
          />
        </Card>

        {/* System Section */}
        <Text style={styles.sectionTitle}>Hệ thống</Text>
        <Card padding={0}>
          <SettingToggle
            icon="⚙️"
            title="Thông báo hệ thống"
            description="Cập nhật bảo trì và thông báo quan trọng"
            value={prefs.systemNotifications}
            onValueChange={() => togglePref('systemNotifications')}
          />
        </Card>

        {/* Quick action */}
        {unreadCount > 0 && (
          <Card style={styles.markAllCard}>
            <TouchableOpacity
              onPress={handleMarkAll}
              style={styles.markAllButton}
            >
              <Text style={styles.markAllIcon}>✓</Text>
              <Text style={styles.markAllText}>
                Đánh dấu {unreadCount} thông báo chưa đọc là đã đọc
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Cài đặt này chỉ áp dụng trên thiết bị này và được lưu cục bộ. Bạn có
            thể thay đổi bất kỳ lúc nào. Một số thông báo quan trọng có thể vẫn
            được gửi để đảm bảo trải nghiệm tốt nhất.
          </Text>
        </View>
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
    width: 24,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerAction: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  quickActionCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.infoLight,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  quickActionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickActionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  openButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  openButtonText: {
    ...typography.bodySmall,
    color: colors.textInverse,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingEmoji: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 76,
  },
  markAllCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.successLight,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  markAllIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    color: colors.textInverse,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  markAllText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
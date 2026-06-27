/**
 * AutoWashPro Notification Settings Screen
 */

import React, { useState } from 'react';
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
import { 
  Text as AppText, 
  Card,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

interface ToggleSetting {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<ToggleSetting[]>([
    {
      id: 'push',
      icon: '📱',
      title: 'Thông báo đẩy',
      subtitle: 'Nhận thông báo từ ứng dụng',
      value: true,
    },
    {
      id: 'booking',
      icon: '📅',
      title: 'Nhắc nhở đặt lịch',
      subtitle: 'Thông báo trước 1 giờ khi đến giờ hẹn',
      value: true,
    },
    {
      id: 'reminder',
      icon: '⏰',
      title: 'Nhắc nhở hàng ngày',
      subtitle: 'Gợi ý đặt lịch rửa xe định kỳ',
      value: false,
    },
    {
      id: 'promo',
      icon: '🎉',
      title: 'Khuyến mãi',
      subtitle: 'Thông báo về ưu đãi và khuyến mãi đặc biệt',
      value: true,
    },
    {
      id: 'voucher',
      icon: '🎟️',
      title: 'Voucher',
      subtitle: 'Thông báo khi có voucher mới hoặc sắp hết hạn',
      value: true,
    },
    {
      id: 'points',
      icon: '⭐',
      title: 'Điểm tích lũy',
      subtitle: 'Thông báo khi có điểm mới',
      value: true,
    },
    {
      id: 'review',
      icon: '⭐',
      title: 'Nhắc đánh giá',
      subtitle: 'Nhắc đánh giá sau khi hoàn thành dịch vụ',
      value: true,
    },
  ]);

  const [soundSettings, setSoundSettings] = useState({
    sound: true,
    vibration: true,
    badge: true,
  });

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, value: !setting.value } : setting
      )
    );
  };

  const toggleSoundSetting = (key: keyof typeof soundSettings) => {
    setSoundSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    Alert.alert('Thành công', 'Đã lưu cài đặt thông báo');
    router.back();
  };

  const SettingToggle: React.FC<{ setting: ToggleSetting }> = ({ setting }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Text style={styles.settingEmoji}>{setting.icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <AppText variant="body">{setting.title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {setting.subtitle}
        </AppText>
      </View>
      <TouchableOpacity
        style={[
          styles.toggle,
          setting.value && styles.toggleActive,
        ]}
        onPress={() => toggleSetting(setting.id)}
      >
        <View style={[
          styles.toggleThumb,
          setting.value && styles.toggleThumbActive,
        ]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Cài đặt thông báo</AppText>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Push Notifications */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Thông báo đẩy
          </AppText>
          <Card padding={0}>
            {settings.map((setting, index) => (
              <React.Fragment key={setting.id}>
                {index > 0 && <View style={styles.divider} />}
                <SettingToggle setting={setting} />
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* Sound & Badge */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Âm thanh & Badge
          </AppText>
          <Card padding={0}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingEmoji}>🔔</Text>
              </View>
              <View style={styles.settingContent}>
                <AppText variant="body">Âm thanh</AppText>
                <AppText variant="caption" color="textSecondary">
                  Phát âm thanh khi có thông báo
                </AppText>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  soundSettings.sound && styles.toggleActive,
                ]}
                onPress={() => toggleSoundSetting('sound')}
              >
                <View style={[
                  styles.toggleThumb,
                  soundSettings.sound && styles.toggleThumbActive,
                ]} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingEmoji}>📳</Text>
              </View>
              <View style={styles.settingContent}>
                <AppText variant="body">Rung</AppText>
                <AppText variant="caption" color="textSecondary">
                  Rung khi có thông báo
                </AppText>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  soundSettings.vibration && styles.toggleActive,
                ]}
                onPress={() => toggleSoundSetting('vibration')}
              >
                <View style={[
                  styles.toggleThumb,
                  soundSettings.vibration && styles.toggleThumbActive,
                ]} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingEmoji}>🔴</Text>
              </View>
              <View style={styles.settingContent}>
                <AppText variant="body">Badge</AppText>
                <AppText variant="caption" color="textSecondary">
                  Hiển thị số thông báo chưa đọc
                </AppText>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  soundSettings.badge && styles.toggleActive,
                ]}
                onPress={() => toggleSoundSetting('badge')}
              >
                <View style={[
                  styles.toggleThumb,
                  soundSettings.badge && styles.toggleThumbActive,
                ]} />
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Giờ yên tĩnh
          </AppText>
          <Card padding={0}>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingEmoji}>🌙</Text>
              </View>
              <View style={styles.settingContent}>
                <AppText variant="body">Giờ yên tĩnh</AppText>
                <AppText variant="caption" color="textSecondary">
                  Tắt thông báo trong giờ nghỉ
                </AppText>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>📝</Text>
          <View style={styles.summaryContent}>
            <AppText variant="body" style={styles.summaryTitle}>
              Tóm tắt cài đặt
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {settings.filter(s => s.value).length} trên {settings.length} loại thông báo đang bật
            </AppText>
          </View>
        </Card>

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
  saveButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    backgroundColor: colors.successLight,
  },
  summaryIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

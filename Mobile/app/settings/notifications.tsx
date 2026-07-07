/**
 * AutoWashPro Notification Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import {
  Text as AppText,
  Card,
  ScreenContainer,
  Header,
  ListItem,
  Icon,
  Icons,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';

interface ToggleSetting {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
}

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const toast = useToast();

  const [settings, setSettings] = useState<ToggleSetting[]>([
    {
      id: 'push',
      icon: 'phone-portrait-outline',
      title: 'Thông báo đẩy',
      subtitle: 'Nhận thông báo từ ứng dụng',
      value: true,
    },
    {
      id: 'booking',
      icon: 'calendar-outline',
      title: 'Nhắc nhở đặt lịch',
      subtitle: 'Thông báo trước 1 giờ khi đến giờ hẹn',
      value: true,
    },
    {
      id: 'reminder',
      icon: 'time-outline',
      title: 'Nhắc nhở hàng ngày',
      subtitle: 'Gợi ý đặt lịch rửa xe định kỳ',
      value: false,
    },
    {
      id: 'promo',
      icon: 'gift-outline',
      title: 'Khuyến mãi',
      subtitle: 'Thông báo về ưu đãi và khuyến mãi đặc biệt',
      value: true,
    },
    {
      id: 'voucher',
      icon: 'pricetag-outline',
      title: 'Voucher',
      subtitle: 'Thông báo khi có voucher mới hoặc sắp hết hạn',
      value: true,
    },
    {
      id: 'points',
      icon: 'star-outline',
      title: 'Điểm tích lũy',
      subtitle: 'Thông báo khi có điểm mới',
      value: true,
    },
    {
      id: 'review',
      icon: 'star-outline',
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
    toast.success('Đã lưu cài đặt', 'Tùy chọn thông báo đã được cập nhật');
    setTimeout(() => router.back(), 600);
  };

  return (
    <ScreenContainer scroll>
      <Header showBack title="Cài đặt thông báo" rightAction={
        <AppText
          variant="body"
          style={{ color: colors.primary, fontWeight: '600' }}
          onPress={handleSave}
        >
          Lưu
        </AppText>
      } />

      {/* Push Notifications */}
      <View style={styles.section}>
        <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
          Thông báo đẩy
        </AppText>
        <Card padding={0}>
          {settings.map((setting, index) => (
            <React.Fragment key={setting.id}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <ListItem
                leadingIcon={setting.icon}
                title={setting.title}
                subtitle={setting.subtitle}
                trailing={
                  <Switch
                    value={setting.value}
                    onValueChange={() => toggleSetting(setting.id)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                }
                showDivider={false}
              />
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
          <ListItem
            leadingIcon="notifications-outline"
            title="Âm thanh"
            subtitle="Phát âm thanh khi có thông báo"
            trailing={
              <Switch
                value={soundSettings.sound}
                onValueChange={() => toggleSoundSetting('sound')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
            showDivider
          />
          <ListItem
            leadingIcon="tablet-portrait-outline"
            title="Rung"
            subtitle="Rung khi có thông báo"
            trailing={
              <Switch
                value={soundSettings.vibration}
                onValueChange={() => toggleSoundSetting('vibration')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
            showDivider
          />
          <ListItem
            leadingIcon="notifications-outline"
            title="Badge"
            subtitle="Hiển thị số thông báo chưa đọc"
            trailing={
              <Switch
                value={soundSettings.badge}
                onValueChange={() => toggleSoundSetting('badge')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
            showDivider={false}
          />
        </Card>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
          Giờ yên tĩnh
        </AppText>
        <Card padding={0}>
          <ListItem
            leadingIcon="moon-outline"
            title="Giờ yên tĩnh"
            subtitle="Tắt thông báo trong giờ nghỉ"
            showChevron
            showDivider={false}
          />
        </Card>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Card style={[styles.summaryCard, { backgroundColor: colors.successLight }]}>
          <Icon name={'information-circle-outline'} size={28} color={colors.success} />
          <View style={styles.summaryContent}>
            <AppText variant="body" style={styles.summaryTitle}>
              Tóm tắt cài đặt
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {settings.filter(s => s.value).length} trên {settings.length} loại thông báo đang bật
            </AppText>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  summaryTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});

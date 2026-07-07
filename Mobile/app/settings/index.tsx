/**
 * AutoWashPro Settings Screen
 * App settings and preferences - refactored with vector icons + ListItem pattern
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Text as AppText,
  ListItem,
  ScreenContainer,
  Header,
  Divider,
  BottomSheet,
  Button,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { logout } = useAuth();

  const [settings, setSettings] = useState({
    pushNotifications: true,
    bookingReminders: true,
    promotions: true,
    sound: true,
    vibration: true,
  });

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);

  const version = Constants.expoConfig?.version || '1.0.0';

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <ScreenContainer background="subtle">
      <Header title="Cài đặt" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Thông báo
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="notifications-outline"
              title="Thông báo đẩy"
              subtitle="Nhận thông báo từ ứng dụng"
              showDivider={false}
              trailing={
                <Switch
                  value={settings.pushNotifications}
                  onValueChange={(v) => updateSetting('pushNotifications', v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Bật thông báo đẩy"
                />
              }
            />
            <Divider margin={0} />
            <ListItem
              leadingIcon="time-outline"
              title="Nhắc nhở đặt lịch"
              subtitle="Thông báo trước 1 giờ"
              showDivider={false}
              trailing={
                <Switch
                  value={settings.bookingReminders}
                  onValueChange={(v) => updateSetting('bookingReminders', v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Bật nhắc nhở"
                />
              }
            />
            <Divider margin={0} />
            <ListItem
              leadingIcon="gift-outline"
              title="Khuyến mãi"
              subtitle="Nhận thông báo khuyến mãi"
              showDivider={false}
              trailing={
                <Switch
                  value={settings.promotions}
                  onValueChange={(v) => updateSetting('promotions', v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Bật khuyến mãi"
                />
              }
            />
          </View>
        </View>

        {/* Sound & Haptics Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Âm thanh & Rung
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="volume-high-outline"
              title="Âm thanh"
              subtitle="Phát âm thanh khi có thông báo"
              showDivider={false}
              trailing={
                <Switch
                  value={settings.sound}
                  onValueChange={(v) => updateSetting('sound', v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Bật âm thanh"
                />
              }
            />
            <Divider margin={0} />
            <ListItem
              leadingIcon="tablet-portrait-outline"
              title="Rung"
              subtitle="Rung khi có thông báo"
              showDivider={false}
              trailing={
                <Switch
                  value={settings.vibration}
                  onValueChange={(v) => updateSetting('vibration', v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Bật rung"
                />
              }
            />
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Hiển thị
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="globe-outline"
              title="Ngôn ngữ"
              trailingText="Tiếng Việt"
              onPress={() => router.push('/settings/language' as any)}
              showDivider={false}
            />
            <Divider margin={0} />
            <ListItem
              leadingIcon="moon-outline"
              title="Chế độ tối"
              subtitle="Theo cài đặt hệ thống"
              trailingText="Hệ thống"
              showDivider={false}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Tài khoản
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="lock-closed-outline"
              title="Đổi mật khẩu"
              showDivider
              onPress={() => router.push('/profile/change-password' as any)}
            />
            <ListItem
              leadingIcon="call-outline"
              title="Đổi số điện thoại"
              showDivider
              onPress={() => router.push('/profile/change-phone' as any)}
            />
            <ListItem
              leadingIcon="mail-outline"
              title="Đổi email"
              showDivider={false}
              onPress={() => router.push('/profile/change-email' as any)}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Dữ liệu
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="trash-outline"
              title="Xóa bộ nhớ đệm"
              subtitle="Giải phóng dung lượng"
              showDivider
              onPress={() => setConfirmClearCache(true)}
            />
            <ListItem
              leadingIcon="download-outline"
              title="Xuất dữ liệu"
              subtitle="Tải về dữ liệu của bạn"
              showDivider={false}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Pháp lý
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="document-text-outline"
              title="Điều khoản sử dụng"
              showDivider
              onPress={() => router.push('/terms' as any)}
            />
            <ListItem
              leadingIcon="shield-checkmark-outline"
              title="Chính sách bảo mật"
              showDivider
              onPress={() => router.push('/privacy' as any)}
            />
            <ListItem
              leadingIcon="information-circle-outline"
              title="Giấy phép"
              showDivider={false}
              onPress={() => router.push('/licenses' as any)}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Về ứng dụng
          </AppText>
          <View style={[styles.group, { backgroundColor: colors.surfaceElevated }]}>
            <ListItem
              leadingIcon="information-circle-outline"
              title="Phiên bản"
              trailingText={version}
              showChevron={false}
              showDivider
              onPress={() => {}}
            />
            <ListItem
              leadingIcon="star-outline"
              title="Đánh giá ứng dụng"
              showDivider
              onPress={() => {}}
            />
            <ListItem
              leadingIcon="chatbubble-outline"
              title="Gửi phản hồi"
              showDivider={false}
              onPress={() => router.push('/feedback' as any)}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <ListItem
            leadingIcon="log-out-outline"
            title="Đăng xuất"
            destructive
            onPress={() => setConfirmLogout(true)}
            showDivider={false}
            style={[styles.logoutItem, { backgroundColor: colors.errorLight }]}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Confirm Logout */}
      <BottomSheet
        visible={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Đăng xuất"
        subtitle="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?"
      >
        <View style={styles.sheetActions}>
          <Button
            title="Hủy"
            variant="outline"
            onPress={() => setConfirmLogout(false)}
            style={styles.sheetBtn}
          />
          <Button
            title="Đăng xuất"
            variant="danger"
            onPress={() => {
              setConfirmLogout(false);
              logout();
            }}
            style={styles.sheetBtn}
          />
        </View>
      </BottomSheet>

      {/* Confirm Clear Cache */}
      <BottomSheet
        visible={confirmClearCache}
        onClose={() => setConfirmClearCache(false)}
        title="Xóa bộ nhớ đệm"
        subtitle="Điều này sẽ xóa tất cả dữ liệu tạm thời. Bạn cần đăng nhập lại."
      >
        <View style={styles.sheetActions}>
          <Button
            title="Hủy"
            variant="outline"
            onPress={() => setConfirmClearCache(false)}
            style={styles.sheetBtn}
          />
          <Button
            title="Xóa"
            variant="danger"
            onPress={() => setConfirmClearCache(false)}
            style={styles.sheetBtn}
          />
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
  },
  sectionTitle: {
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 16,
  },
  group: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutItem: {
    borderRadius: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  sheetBtn: {
    flex: 1,
  },
  bottomPadding: {
    height: 48,
  },
});
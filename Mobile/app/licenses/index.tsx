/**
 * AutoWashPro Licenses Screen
 * Third-party licenses and attributions
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {
  Text as AppText,
  Card,
  ScreenContainer,
  Header,
  Icon,
  Icons,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

interface License {
  name: string;
  version: string;
  description: string;
  license: string;
  url?: string;
}

const LICENSES: License[] = [
  {
    name: 'React',
    version: '18.2.0',
    description: 'A JavaScript library for building user interfaces',
    license: 'MIT License',
    url: 'https://reactjs.org',
  },
  {
    name: 'React Native',
    version: '0.73.x',
    description: 'A framework for building native mobile apps using React',
    license: 'MIT License',
    url: 'https://reactnative.dev',
  },
  {
    name: 'Expo',
    version: '50.x',
    description: 'An open-source platform for making universal native apps',
    license: 'MIT License',
    url: 'https://expo.dev',
  },
  {
    name: 'Expo Router',
    version: '14.x',
    description: 'File-based routing for React Native apps',
    license: 'MIT License',
    url: 'https://expo.github.io/router',
  },
  {
    name: 'Axios',
    version: '1.6.x',
    description: 'Promise based HTTP client for the browser and Node.js',
    license: 'MIT License',
    url: 'https://axios-http.com',
  },
  {
    name: 'React Navigation',
    version: '6.x',
    description: 'Routing and navigation for React Native apps',
    license: 'MIT License',
    url: 'https://reactnavigation.org',
  },
  {
    name: 'Expo Secure Store',
    version: '12.x',
    description: 'A Keychain/Keystore abstraction for React Native',
    license: 'MIT License',
    url: 'https://docs.expo.dev/versions/latest/sdk/securestore',
  },
  {
    name: 'React Native Safe Area Context',
    version: '4.x',
    description: 'Handle safe area insets in React Native apps',
    license: 'MIT License',
    url: 'https://github.com/th3rdwave/react-native-safe-area-context',
  },
  {
    name: 'AsyncStorage',
    version: '1.x',
    description: 'AsyncStorage is a simple, unencrypted, asynchronous, persistent key-value storage',
    license: 'MIT License',
    url: 'https://react-native-async-storage.github.io/async-storage',
  },
  {
    name: 'Date-fns',
    version: '3.x',
    description: 'Modern JavaScript date utility library',
    license: 'MIT License',
    url: 'https://date-fns.org',
  },
  {
    name: 'UUID',
    version: '9.x',
    description: 'Generate RFC4122 UUIDs in JavaScript',
    license: 'MIT License',
    url: 'https://github.com/uuidjs/uuid',
  },
  {
    name: 'Expo Image Picker',
    version: '14.x',
    description: 'An API for accessing images from the device library or camera',
    license: 'MIT License',
    url: 'https://docs.expo.dev/versions/latest/sdk/imagepicker',
  },
];

export default function LicensesScreen() {
  const colors = useColors();

  return (
    <ScreenContainer scroll>
      <Header showBack title="Giấy phép" />

      {/* Intro */}
      <View style={styles.introWrapper}>
        <Card style={[styles.introCard, { backgroundColor: colors.primarySubtle }]}>
          <Icon name={'information-circle-outline'} size={20} color={colors.primary} />
          <AppText variant="body" color="textSecondary" style={styles.introText}>
            AutoWashPro sử dụng các thư viện mã nguồn mở. Dưới đây là danh sách các giấy phép của các thư viện được sử dụng.
          </AppText>
        </Card>
      </View>

      {/* License List */}
      {LICENSES.map((license, index) => (
        <View key={index} style={styles.licenseWrapper}>
          <Card style={styles.licenseCard}>
            <View style={styles.licenseHeader}>
              <View style={styles.licenseInfo}>
                <AppText variant="h4">{license.name}</AppText>
                <View style={[styles.versionBadge, { backgroundColor: colors.surface }]}>
                  <AppText variant="caption" color="textSecondary">
                    v{license.version}
                  </AppText>
                </View>
              </View>
              <View style={styles.licenseType}>
                <Icon name={Icons.documentOutline} size={14} color={colors.primary} />
                <AppText variant="caption" color="primary">
                  {license.license}
                </AppText>
              </View>
            </View>

            <AppText variant="bodySmall" color="textSecondary" style={styles.description}>
              {license.description}
            </AppText>
          </Card>
        </View>
      ))}

      {/* MIT License Note */}
      <View style={styles.mitWrapper}>
        <Card style={[styles.mitNote, { backgroundColor: colors.infoLight }]}>
          <Icon name={'information-circle-outline'} size={24} color={colors.info} />
          <View style={styles.mitContent}>
            <AppText variant="h4" style={styles.mitTitle}>
              Về MIT License
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.mitText}>
              MIT License là giấy phép phần mềm tự do cho phép sử dụng, sao chép, sửa đổi, hợp nhất, xuất bản, phân phối, sublicense, và/hoặc bán bản sao của phần mềm mà không cần thông báo.
            </AppText>
          </View>
        </Card>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <AppText variant="caption" color="textTertiary" style={styles.footerText}>
          © 2024 AutoWashPro. Tất cả các quyền được bảo lưu.
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  introWrapper: {
    paddingHorizontal: spacing.md,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  introText: {
    flex: 1,
  },
  licenseWrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  licenseCard: {},
  licenseHeader: {
    marginBottom: spacing.sm,
  },
  licenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  versionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  licenseType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  description: {
    lineHeight: 20,
  },
  mitWrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  mitNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  mitContent: {
    flex: 1,
  },
  mitTitle: {
    marginBottom: spacing.xs,
  },
  mitText: {
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    textAlign: 'center',
  },
});

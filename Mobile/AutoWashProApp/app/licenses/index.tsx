/**
 * AutoWashPro Licenses Screen
 * Third-party licenses and attributions
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
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
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Giấy phép</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <Card style={styles.introCard}>
          <AppText variant="body" color="textSecondary">
            AutoWashPro sử dụng các thư viện mã nguồn mở. Dưới đây là danh sách các giấy phép của các thư viện được sử dụng.
          </AppText>
        </Card>

        {/* License List */}
        {LICENSES.map((license, index) => (
          <Card key={index} style={styles.licenseCard}>
            <View style={styles.licenseHeader}>
              <View style={styles.licenseInfo}>
                <AppText variant="h4">{license.name}</AppText>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v{license.version}</Text>
                </View>
              </View>
              <View style={styles.licenseType}>
                <Text style={styles.licenseTypeIcon}>📜</Text>
                <AppText variant="caption" color="primary">
                  {license.license}
                </AppText>
              </View>
            </View>
            
            <AppText variant="bodySmall" color="textSecondary" style={styles.description}>
              {license.description}
            </AppText>
          </Card>
        ))}

        {/* MIT License Note */}
        <Card style={styles.mitNote}>
          <Text style={styles.mitIcon}>ℹ️</Text>
          <View style={styles.mitContent}>
            <AppText variant="h4" style={styles.mitTitle}>
              Về MIT License
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.mitText}>
              MIT License là giấy phép phần mềm tự do cho phép sử dụng, sao chép, sửa đổi, hợp nhất, xuất bản, phân phối, sublicense, và/hoặc bán bản sao của phần mềm mà không cần thông báo.
            </AppText>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <AppText variant="caption" color="textTertiary" style={styles.footerText}>
            © 2024 AutoWashPro. Tất cả các quyền được bảo lưu.
          </AppText>
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
  introCard: {
    margin: spacing.md,
    backgroundColor: colors.primaryLight,
  },
  licenseCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  versionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  licenseType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  licenseTypeIcon: {
    fontSize: 14,
  },
  description: {
    lineHeight: 20,
  },
  mitNote: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.infoLight,
  },
  mitIcon: {
    fontSize: 24,
    marginRight: spacing.md,
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
  bottomPadding: {
    height: spacing.xxl,
  },
});

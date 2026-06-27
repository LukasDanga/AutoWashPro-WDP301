/**
 * AutoWashPro About Screen
 * App information and credits
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text as AppText, 
  Card,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

export default function AboutScreen() {
  const router = useRouter();

  const handleRateApp = () => {
    // Open app store
    Linking.openURL('https://apps.apple.com');
  };

  const handleVisitWebsite = () => {
    Linking.openURL('https://autowashpro.vn');
  };

  const handleFollowFacebook = () => {
    Linking.openURL('https://facebook.com/autowashpro');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Về AutoWashPro</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🚗</Text>
          </View>
          <AppText variant="h2" style={styles.appName}>
            AutoWashPro
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            Phiên bản 1.0.0
          </AppText>
        </View>

        {/* Description */}
        <Card style={styles.descriptionCard}>
          <AppText variant="body" style={styles.description}>
            AutoWashPro là ứng dụng đặt lịch rửa xe thông minh, giúp bạn dễ dàng đặt lịch dịch vụ rửa xe tại các chi nhánh AutoWashPro trên toàn quốc.
          </AppText>
          <View style={styles.divider} />
          <AppText variant="body" color="textSecondary">
            Với AutoWashPro, bạn có thể:
          </AppText>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✓ Đặt lịch rửa xe 24/7</Text>
            <Text style={styles.featureItem}>✓ Theo dõi lịch sử đặt lịch</Text>
            <Text style={styles.featureItem}>✓ Tích điểm và đổi voucher</Text>
            <Text style={styles.featureItem}>✓ Thanh toán không tiền mặt</Text>
            <Text style={styles.featureItem}>✓ Nhận thông báo nhắc nhở</Text>
          </View>
        </Card>

        {/* Connect Section */}
        <View style={styles.section}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Kết nối với chúng tôi
          </AppText>
          <Card padding={0}>
            <TouchableOpacity style={styles.linkRow} onPress={handleVisitWebsite}>
              <View style={styles.linkIcon}>
                <Text style={styles.linkEmoji}>🌐</Text>
              </View>
              <View style={styles.linkContent}>
                <AppText variant="body">Website</AppText>
                <AppText variant="caption" color="textSecondary">
                  autowashpro.vn
                </AppText>
              </View>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.linkRow} onPress={handleFollowFacebook}>
              <View style={styles.linkIcon}>
                <Text style={styles.linkEmoji}>📘</Text>
              </View>
              <View style={styles.linkContent}>
                <AppText variant="body">Facebook</AppText>
                <AppText variant="caption" color="textSecondary">
                  @autowashpro
                </AppText>
              </View>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('tel:19001234')}>
              <View style={styles.linkIcon}>
                <Text style={styles.linkEmoji}>📞</Text>
              </View>
              <View style={styles.linkContent}>
                <AppText variant="body">Hotline</AppText>
                <AppText variant="caption" color="textSecondary">
                  1900 1234
                </AppText>
              </View>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Rate App */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.rateButton} onPress={handleRateApp}>
            <Text style={styles.rateIcon}>⭐</Text>
            <View style={styles.rateContent}>
              <AppText variant="body" color="textInverse">
                Đánh giá ứng dụng
              </AppText>
              <AppText variant="caption" color="textInverse" style={styles.rateSubtext}>
                Giúp chúng tôi cải thiện ứng dụng
              </AppText>
            </View>
            <Text style={styles.rateArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightIcon}>©</Text>
          <AppText variant="caption" color="textTertiary">
            2024 AutoWashPro. Mọi quyền được bảo lưu.
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    marginBottom: spacing.xs,
  },
  descriptionCard: {
    margin: spacing.md,
    marginTop: 0,
  },
  description: {
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  featureList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  featureItem: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  section: {
    padding: spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  linkEmoji: {
    fontSize: 18,
  },
  linkContent: {
    flex: 1,
  },
  linkArrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  rateIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  rateContent: {
    flex: 1,
  },
  rateSubtext: {
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  rateArrow: {
    fontSize: 24,
    color: colors.textInverse,
    opacity: 0.8,
  },
  copyright: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  copyrightIcon: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

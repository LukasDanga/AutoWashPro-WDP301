/**
 * AutoWashPro About Screen
 * App information and credits
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Linking,
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
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

export default function AboutScreen() {
  const colors = useColors();

  const handleRateApp = () => {
    Linking.openURL('https://apps.apple.com');
  };

  const handleVisitWebsite = () => {
    Linking.openURL('https://autowashpro.vn');
  };

  const handleFollowFacebook = () => {
    Linking.openURL('https://facebook.com/autowashpro');
  };

  return (
    <ScreenContainer>
      <Header showBack title="Về AutoWashPro" />

      {/* App Logo */}
      <View style={[styles.logoSection, { backgroundColor: colors.background }]}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <Icon name={Icons.car} size={48} color={colors.textInverse} />
        </View>
        <AppText variant="h2" style={styles.appName}>
          AutoWashPro
        </AppText>
        <AppText variant="bodySmall" color="textSecondary">
          Phiên bản 1.0.0
        </AppText>
      </View>

      {/* Description */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <Card>
          <AppText variant="body" style={styles.description}>
            AutoWashPro là ứng dụng đặt lịch rửa xe thông minh, giúp bạn dễ dàng đặt lịch dịch vụ rửa xe tại các chi nhánh AutoWashPro trên toàn quốc.
          </AppText>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <AppText variant="body" color="textSecondary">
            Với AutoWashPro, bạn có thể:
          </AppText>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name={Icons.checkmark} size={16} color={colors.success} />
              <AppText variant="body" color="textSecondary">Đặt lịch rửa xe 24/7</AppText>
            </View>
            <View style={styles.featureItem}>
              <Icon name={Icons.checkmark} size={16} color={colors.success} />
              <AppText variant="body" color="textSecondary">Theo dõi lịch sử đặt lịch</AppText>
            </View>
            <View style={styles.featureItem}>
              <Icon name={Icons.checkmark} size={16} color={colors.success} />
              <AppText variant="body" color="textSecondary">Tích điểm và đổi voucher</AppText>
            </View>
            <View style={styles.featureItem}>
              <Icon name={Icons.checkmark} size={16} color={colors.success} />
              <AppText variant="body" color="textSecondary">Thanh toán không tiền mặt</AppText>
            </View>
            <View style={styles.featureItem}>
              <Icon name={Icons.checkmark} size={16} color={colors.success} />
              <AppText variant="body" color="textSecondary">Nhận thông báo nhắc nhở</AppText>
            </View>
          </View>
        </Card>
      </View>

      {/* Connect Section */}
      <View style={styles.section}>
        <AppText variant="h4" style={styles.sectionTitle}>
          Kết nối với chúng tôi
        </AppText>
        <Card padding={0}>
          <ListItem
            leadingIcon="globe-outline"
            title="Website"
            subtitle="autowashpro.vn"
            showChevron
            onPress={handleVisitWebsite}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
          <ListItem
            leadingIcon="logo-facebook"
            title="Facebook"
            subtitle="@autowashpro"
            showChevron
            onPress={handleFollowFacebook}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
          <ListItem
            leadingIcon="call-outline"
            title="Hotline"
            subtitle="1900 1234"
            showChevron
            onPress={() => Linking.openURL('tel:19001234')}
          />
        </Card>
      </View>

      {/* Rate App */}
      <View style={styles.section}>
        <Card
          style={[styles.rateCard, { backgroundColor: colors.primary }]}
          onPress={handleRateApp}
        >
          <Icon name={Icons.starOutline} size={28} color={colors.textInverse} />
          <View style={styles.rateContent}>
            <AppText variant="body" color="textInverse">
              Đánh giá ứng dụng
            </AppText>
            <AppText variant="caption" color="textInverse" style={styles.rateSubtext}>
              Giúp chúng tôi cải thiện ứng dụng
            </AppText>
          </View>
          <Icon name="chevron-forward" size={24} color={colors.textInverse} />
        </Card>
      </View>

      {/* Copyright */}
      <View style={styles.copyright}>
        <Icon name="information-circle-outline" size={16} color={colors.textTertiary} />
        <AppText variant="caption" color="textTertiary">
          2024 AutoWashPro. Mọi quyền được bảo lưu.
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  appName: {
    marginBottom: spacing.xs,
  },
  description: {
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  featureList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  rowDivider: {
    height: 1,
    marginLeft: 72,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.md,
  },
  rateContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rateSubtext: {
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  copyright: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
});

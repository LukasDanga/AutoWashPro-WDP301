/**
 * AutoWashPro Booking Tab Screen
 * Quick-access landing for booking flow with vector icons (no emojis)
 * Following UX guidelines: no-emoji-icons, visual-hierarchy, scale-feedback,
 *   touch-target-size, semantic colors
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Text as AppText,
  Card,
  PressableScale,
  Icon,
  Icons,
  ScreenContainer,
} from '../../src/components/common';
import { useColors, useTheme } from '../../src/theme/ThemeContext';
import { toGradientColors, getGradients } from '../../src/theme/gradients';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

export default function BookingTabScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isDark } = useTheme();
  const gradients = getGradients(isDark);

  return (
    <ScreenContainer scroll background="subtle">
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="h2">Đặt lịch rửa xe</AppText>
        <AppText variant="bodySmall" color="textSecondary">
          Chọn dịch vụ phù hợp với bạn
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main CTA with gradient */}
        <PressableScale
          onPress={() => router.push('/booking')}
          accessibilityRole="button"
          accessibilityLabel="Đặt lịch ngay"
          style={styles.mainCTAWrap}
        >
          <LinearGradient
            colors={toGradientColors(gradients.hero) as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCTA}
          >
            <View style={[styles.ctaBlob, styles.ctaBlob1]} />
            <View style={[styles.ctaBlob, styles.ctaBlob2]} />
            <View style={styles.mainCTAIcon}>
              <Icon name={Icons.carOutline} size={32} color={colors.primary} />
            </View>
            <View style={styles.mainCTAText}>
              <AppText variant="h3" color="textInverse">
                Đặt lịch ngay
              </AppText>
              <AppText
                variant="bodySmall"
                color="textInverse"
                style={{ opacity: 0.9 }}
              >
                Rửa xe nhanh chóng trong vài bước
              </AppText>
            </View>
            <Icon name={Icons.forward} size={22} color={colors.textInverse} />
          </LinearGradient>
        </PressableScale>

        {/* Service type options */}
        <AppText variant="h4" style={styles.sectionTitle}>
          Chọn loại dịch vụ
        </AppText>

        <ServiceOption
          icon={Icons.sparkle}
          tint="#1E88E5"
          bg={colors.primaryLight}
          title="Rửa ngoài"
          subtitle="Rửa và làm sạch bề mặt xe"
          onPress={() =>
            router.push({ pathname: '/booking', params: { type: 'external' } })
          }
        />
        <ServiceOption
          icon={Icons.star}
          tint={colors.warning}
          bg={colors.warningLight}
          title="Dọn nội thất"
          subtitle="Hút bụi, lau chùi bên trong xe"
          onPress={() =>
            router.push({ pathname: '/booking', params: { type: 'internal' } })
          }
        />
        <ServiceOption
          icon={Icons.success}
          tint={colors.success}
          bg={colors.successLight}
          title="Rửa toàn diện"
          subtitle="Rửa ngoài + Dọn nội thất"
          onPress={() =>
            router.push({ pathname: '/booking', params: { type: 'full' } })
          }
        />

        {/* Recurring booking */}
        <Card style={styles.recurringCard}>
          <View style={styles.recurringRow}>
            <View style={styles.recurringIconWrap}>
              <Icon name={Icons.refreshOutline} size={24} color={colors.warning} />
            </View>
            <View style={styles.recurringText}>
              <AppText variant="body" style={styles.recurringTitle}>
                Đặt lịch định kỳ
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Tiết kiệm thời gian với lịch rửa xe hàng tuần
              </AppText>
            </View>
          </View>
          <PressableScale
            onPress={() => router.push('/booking/recurring')}
            style={styles.recurringButton}
            accessibilityRole="button"
            accessibilityLabel="Tạo lịch định kỳ"
          >
            <AppText variant="bodySmall" color="primary" style={styles.recurringButtonText}>
              Tạo lịch
            </AppText>
            <Icon name={Icons.forward} size={14} color={colors.primary} />
          </PressableScale>
        </Card>

        {/* Info banner */}
        <Card style={styles.infoBanner}>
          <View style={styles.infoIconWrap}>
            <Icon name={Icons.info} size={20} color={colors.info} />
          </View>
          <View style={styles.infoContent}>
            <AppText variant="bodySmall" style={styles.infoTitle}>
              Mẹo đặt lịch
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {'• Đặt trước để được ưu tiên\n• Mang theo mã QR khi đến\n• Có thể hủy lịch trước 2 giờ'}
            </AppText>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

interface ServiceOptionProps {
  icon: string;
  tint: string;
  bg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const ServiceOption: React.FC<ServiceOptionProps> = ({
  icon,
  tint,
  bg,
  title,
  subtitle,
  onPress,
}) => {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      style={styles.optionCardWrap}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Card padding="md" pressFeedback="both">
        <View style={styles.optionRow}>
          <View style={[styles.optionIcon, { backgroundColor: bg }]}>
            <Icon name={icon} size={24} color={tint} />
          </View>
          <View style={styles.optionContent}>
            <AppText variant="body" style={styles.optionTitle}>
              {title}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {subtitle}
            </AppText>
          </View>
          <Icon name={Icons.forward} size={20} color={colors.textTertiary} />
        </View>
      </Card>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  // Main CTA
  mainCTAWrap: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  mainCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    minHeight: 88,
    overflow: 'hidden',
  },
  ctaBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ctaBlob1: {
    width: 120,
    height: 120,
    top: -40,
    right: -30,
  },
  ctaBlob2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -10,
  },
  mainCTAIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  mainCTAText: {
    flex: 1,
  },
  // Options
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  optionCardWrap: {
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  // Recurring
  recurringCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recurringIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recurringText: {
    flex: 1,
  },
  recurringTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  recurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 36,
  },
  recurringButtonText: {
    fontWeight: '600',
  },
  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#DBEAFE',
    padding: spacing.md,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});

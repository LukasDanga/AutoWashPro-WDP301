/**
 * AutoWashPro Booking Tab Screen
 * 3 booking options: Đặt lịch thường, Đặt lịch định kỳ, Gói lượt
 * Glass-card style with premium shadows
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Text as AppText,
  PressableScale,
  Icon,
  Icons,
  ScreenContainer,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

export default function BookingTabScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer background="subtle" edges={['top']}>
      {/* Top App Bar - matching HTML: bg-white/80 backdrop-blur shadow-sm */}
      <View style={styles.header}>
        <View>
          <AppText variant="h3" color="primary">
            Đặt lịch dịch vụ
          </AppText>
          <AppText variant="label" color="textSecondary">
            Chọn giải pháp chăm sóc xe của bạn
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Đặt lịch thường - glass-card style */}
        <PressableScale
          onPress={() => router.push('/booking')}
          accessibilityRole="button"
          accessibilityLabel="Đặt lịch thường"
          style={styles.pressable}
        >
          <View style={[styles.card, styles.glassCard]}>
            <View style={styles.cardRow}>
              <View style={styles.iconContainer}>
                <Icon name={Icons.carOutline} size={32} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <AppText variant="h4" color="textPrimary">
                  Đặt lịch thường
                </AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  Rửa xe đơn lẻ, nhanh chóng &amp; tiện lợi
                </AppText>
              </View>
              <Icon name={Icons.forward} size={20} color={colors.primary} />
            </View>
          </View>
        </PressableScale>

        {/* Đặt lịch định kỳ - glass-card style */}
        <PressableScale
          onPress={() => router.push('/booking/recurring')}
          accessibilityRole="button"
          accessibilityLabel="Đặt lịch định kỳ"
          style={styles.pressable}
        >
          <View style={[styles.card, styles.glassCard]}>
            <View style={styles.cardRow}>
              <View style={styles.iconContainer}>
                <Icon name={Icons.refresh} size={32} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <AppText variant="h4" color="textPrimary">
                  Đặt lịch định kỳ
                </AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  Lên lịch tự động hàng tuần, tiết kiệm thời gian
                </AppText>
              </View>
              <Icon name={Icons.forward} size={20} color={colors.primary} />
            </View>
          </View>
        </PressableScale>

        {/* Gói lượt - glass-card style with Best Value badge */}
        <PressableScale
          onPress={() => router.push('/slot-packs')}
          accessibilityRole="button"
          accessibilityLabel="Gói lượt"
          style={styles.pressable}
        >
          <View style={[styles.card, styles.glassCard, styles.slotPackCard]}>
            {/* Best Value badge */}
            <View style={styles.badge}>
              <AppText variant="caption" color="textOnAccent">
                Best Value
              </AppText>
            </View>

            <View style={styles.cardRow}>
              <View style={styles.iconContainerAccent}>
                <Icon name={Icons.voucher} size={32} color={colors.accent} />
              </View>
              <View style={styles.cardText}>
                <AppText variant="h4" color="textPrimary">
                  Gói lượt
                </AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  Mua gói nhiều lượt để nhận giá ưu đãi tốt nhất
                </AppText>
              </View>
              <Icon name={Icons.forward} size={20} color={colors.accent} />
            </View>
          </View>
        </PressableScale>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Header - matching HTML: px-margin-mobile py-base, bg-white/80
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 80,
    gap: spacing.md,
  },

  // Pressable wrapper
  pressable: {
    marginBottom: 0,
  },

  // Glass card base - matching HTML: bg-white/95, border rgba(255,255,255,0.4), premium-shadow
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    // premium-shadow: box-shadow: 0 10px 30px -5px rgba(0, 80, 203, 0.15)
    ...Platform.select({
      ios: {
        shadowColor: '#0050CB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
      },
      android: {
        elevation: 8,
        shadowColor: '#0050CB',
      },
      default: {
        elevation: 8,
        shadowColor: '#0050CB',
      },
    }),
  },

  // Card row layout - matching HTML: flex items-center space-x-5
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md + 4,
  },

  // Icon container - matching HTML: w-16 h-16 bg-primary-container/10 rounded-2xl
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerAccent: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 204, 249, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card text
  cardText: {
    flex: 1,
  },



  // Slot pack card - with border-2 and badge
  slotPackCard: {
    borderWidth: 2,
    borderColor: 'rgba(0, 102, 255, 0.2)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 204, 249, 1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomLeftRadius: borderRadius.lg,
  },
});



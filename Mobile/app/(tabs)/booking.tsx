/**
 * AutoWashPro Booking Tab Screen
 * 3 booking options: Đặt lịch thường, Đặt lịch định kỳ, Gói lượt
 * Modern, Minimal, Premium UI
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text as AppText,
  PressableScale,
  Icon,
  Icons,
  ScreenContainer,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';

export default function BookingTabScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(30)).current;
  
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim2 = useRef(new Animated.Value(30)).current;
  
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim3 = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const createAnimation = (fade: Animated.Value, slide: Animated.Value, delay: number) => {
      return Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
      ]);
    };

    Animated.stagger(100, [
      createAnimation(fadeAnim1, slideAnim1, 0),
      createAnimation(fadeAnim2, slideAnim2, 0),
      createAnimation(fadeAnim3, slideAnim3, 0),
    ]).start();
  }, []);

  return (
    <ScreenContainer background="subtle" edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <AppText style={styles.headerTitle} color="#1A1A1A">
            Đặt lịch dịch vụ
          </AppText>
          <AppText style={styles.headerSubtitle} color="#6B7280">
            Chọn giải pháp chăm sóc xe phù hợp
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Đặt lịch thường */}
        <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: slideAnim1 }] }}>
          <PressableScale
            scaleValue={0.98}
            onPress={() => router.push('/booking')}
            accessibilityRole="button"
            accessibilityLabel="Đặt lịch thường"
            style={styles.pressable}
          >
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                  <Icon name={Icons.carOutline} size={28} color={colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <AppText style={styles.cardTitle} color="#1A1A1A">
                    Đặt lịch thường
                  </AppText>
                  <AppText style={styles.cardDescription} color="#6B7280">
                    Rửa xe đơn lẻ, nhanh chóng & tiện lợi
                  </AppText>
                </View>
                <Icon name={Icons.forward} size={24} color="#CBD5E1" />
              </View>
            </View>
          </PressableScale>
        </Animated.View>

        {/* Đặt lịch định kỳ */}
        <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: slideAnim2 }] }}>
          <PressableScale
            scaleValue={0.98}
            onPress={() => router.push('/booking/recurring')}
            accessibilityRole="button"
            accessibilityLabel="Đặt lịch định kỳ"
            style={styles.pressable}
          >
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                  <Icon name={Icons.refresh} size={28} color={colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <AppText style={styles.cardTitle} color="#1A1A1A">
                    Đặt lịch định kỳ
                  </AppText>
                  <AppText style={styles.cardDescription} color="#6B7280">
                    Lên lịch tự động hàng tuần, tiết kiệm thời gian
                  </AppText>
                </View>
                <Icon name={Icons.forward} size={24} color="#CBD5E1" />
              </View>
            </View>
          </PressableScale>
        </Animated.View>

        {/* Gói lượt */}
        <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: slideAnim3 }] }}>
          <PressableScale
            scaleValue={0.98}
            onPress={() => router.push('/slot-packs')}
            accessibilityRole="button"
            accessibilityLabel="Gói lượt"
            style={styles.pressable}
          >
            <View style={[styles.card, styles.slotPackCard]}>
              {/* Best Value badge */}
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>Best Value</AppText>
                </View>
              </View>

              <View style={styles.cardRow}>
                <View style={styles.iconContainerAccent}>
                  <Icon name={Icons.voucher} size={28} color={colors.accent} />
                </View>
                <View style={styles.cardText}>
                  <AppText style={styles.cardTitle} color="#1A1A1A">
                    Gói lượt
                  </AppText>
                  <AppText style={styles.cardDescription} color="#6B7280">
                    Mua gói nhiều lượt để nhận giá ưu đãi tốt nhất
                  </AppText>
                </View>
                <Icon name={Icons.forward} size={24} color="#CBD5E1" />
              </View>
            </View>
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 26,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    fontSize: 14,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
    gap: 16,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
  },

  // Pressable wrapper
  pressable: {
    marginBottom: 0,
  },

  // Card base
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9EEF5',
    minHeight: 110,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      default: {
        elevation: 2,
      },
    }),
  },

  // Card row layout
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },

  // Icon container 56x56
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerAccent: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card text
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    ...typography.h4,
    fontSize: 18,
    fontWeight: '600',
  },
  cardDescription: {
    ...typography.bodySmall,
    fontSize: 14,
    lineHeight: 20,
  },

  // Slot pack card specific
  slotPackCard: {
    position: 'relative',
    overflow: 'visible',
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    right: 24,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {
        elevation: 4,
      },
    }),
  },
  badge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

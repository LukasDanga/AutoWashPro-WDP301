/**
 * AutoWashPro Booking Tab Screen
 * 3 booking options: Đặt lịch thường, Đặt lịch định kỳ, Gói lượt
 * Modern, Minimal, Premium UI
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text as AppText,
  PressableScale,
  Icon,
  Icons,
  ScreenContainer,
  Card,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { shadows, layout } from '../../src/theme/spacing';

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
          <AppText variant="h2" color="textPrimary">
            Đặt lịch dịch vụ
          </AppText>
          <AppText variant="body" color="textSecondary">
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
            <Card accentBlob padding={0}>
              <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                  <Icon name={Icons.carOutline} size={28} color={colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <AppText variant="h4" color="textPrimary">
                    Đặt lịch thường
                  </AppText>
                  <AppText variant="body" color="textSecondary">
                    Rửa xe đơn lẻ, nhanh chóng & tiện lợi
                  </AppText>
                </View>
                <Icon name={Icons.forward} size={24} color="#CBD5E1" />
              </View>
            </Card>
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
            <Card accentBlob padding={0}>
              <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                  <Icon name={Icons.refresh} size={28} color={colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <AppText variant="h4" color="textPrimary">
                    Đặt lịch định kỳ
                  </AppText>
                  <AppText variant="body" color="textSecondary">
                    Lên lịch tự động hàng tuần, tiết kiệm thời gian
                  </AppText>
                </View>
                <Icon name={Icons.forward} size={24} color="#CBD5E1" />
              </View>
            </Card>
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
            <View style={{ position: 'relative' }}>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, { backgroundColor: colors.infoLight }]}>
                  <AppText variant="labelSmall" style={{ color: colors.info }}>Best Value</AppText>
                </View>
              </View>
              <LinearGradient
                colors={['#FFFFFF', '#F0F9FF'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradientCard, styles.slotPackCard]}
              >
                <View style={[styles.cardBlob, { backgroundColor: `${colors.accent}1F` }]} />
                <View style={styles.cardRow}>
                  <View style={styles.iconContainerAccent}>
                    <Icon name={Icons.voucher} size={28} color={colors.accent} />
                  </View>
                  <View style={styles.cardText}>
                    <AppText variant="h4" color="textPrimary">
                      Gói lượt
                    </AppText>
                    <AppText variant="body" color="textSecondary">
                      Mua gói nhiều lượt để nhận giá ưu đãi tốt nhất
                    </AppText>
                  </View>
                  <Icon name={Icons.forward} size={24} color="#CBD5E1" />
                </View>
              </LinearGradient>
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

  // Card base (legacy for LinearGradient)
  gradientCard: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.md,
  },
  cardBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -30,
    zIndex: -1,
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

  // Slot pack card specific
  slotPackCard: {
    position: 'relative',
    overflow: 'visible',
    borderColor: '#BAE6FD', // colors.infoLight hex
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});

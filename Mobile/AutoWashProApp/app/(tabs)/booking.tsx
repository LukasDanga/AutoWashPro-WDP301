/**
 * AutoWashPro Booking Tab Screen
 * Quick access to booking flow
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
import { Text as AppText, Card } from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

export default function BookingTabScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Main Booking Button */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => router.push('/booking')}
        >
          <View style={styles.mainButtonContent}>
            <View style={styles.mainButtonIcon}>
              <Text style={styles.mainButtonEmoji}>🚗✨</Text>
            </View>
            <View style={styles.mainButtonText}>
              <AppText variant="h3" color="textInverse">
                Đặt lịch ngay
              </AppText>
              <AppText variant="bodySmall" color="textInverse" style={{ opacity: 0.9 }}>
                Rửa xe nhanh chóng trong vài bước
              </AppText>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Booking Options */}
        <View style={styles.optionsContainer}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Chọn loại dịch vụ
          </AppText>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push({
              pathname: '/booking',
              params: { type: 'external' }
            })}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.optionEmoji}>🚿</Text>
            </View>
            <View style={styles.optionContent}>
              <AppText variant="body" style={styles.optionTitle}>
                Rửa ngoài
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Rửa và làm sạch bề mặt xe
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push({
              pathname: '/booking',
              params: { type: 'internal' }
            })}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.optionEmoji}>🧹</Text>
            </View>
            <View style={styles.optionContent}>
              <AppText variant="body" style={styles.optionTitle}>
                Dọn nội thất
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Hút bụi, lau chùi bên trong xe
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push({
              pathname: '/booking',
              params: { type: 'full' }
            })}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.optionEmoji}>🌟</Text>
            </View>
            <View style={styles.optionContent}>
              <AppText variant="body" style={styles.optionTitle}>
                Rửa toàn diện
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Rửa ngoài + Dọn nội thất
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recurring Booking */}
        <Card style={styles.recurringCard}>
          <View style={styles.recurringContent}>
            <View style={styles.recurringIcon}>
              <Text style={styles.recurringEmoji}>🔄</Text>
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
          <TouchableOpacity
            style={styles.recurringButton}
            onPress={() => router.push('/booking/recurring')}
          >
            <AppText variant="bodySmall" color="primary">
              Tạo lịch
            </AppText>
          </TouchableOpacity>
        </Card>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <AppText variant="bodySmall" style={styles.infoTitle}>
              Mẹo đặt lịch
            </AppText>
            <AppText variant="caption" color="textSecondary">
              • Đặt trước để được ưu tiên{'\n'}
              • Mang theo mã QR khi đến{'\n'}
              • Có thể hủy lịch trước 2 giờ
            </AppText>
          </View>
        </Card>
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
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  mainButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  mainButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainButtonIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  mainButtonEmoji: {
    fontSize: 28,
  },
  mainButtonText: {
    flex: 1,
  },
  arrowIcon: {
    fontSize: 24,
    color: colors.textInverse,
  },
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  recurringCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.warningLight,
  },
  recurringContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recurringIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recurringEmoji: {
    fontSize: 24,
  },
  recurringText: {
    flex: 1,
  },
  recurringTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  recurringButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
  },
  infoEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});

/**
 * AutoWashPro Feedback/Review Screen
 * Submit rating and feedback for completed booking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingApi } from '../../../src/api';
import { sseService } from '../../../src/services/sse';
import {
  Text as AppText,
  Card,
  Button,
  Loading,
  Icon,
  Icons,
  Header,
  ScreenContainer,
  AlertDialog,
  useToast,
} from '../../../src/components/common';
import { useColors } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import type { Booking } from '../../../src/types';
import { formatDate } from '../../../src/utils';

export default function FeedbackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await bookingApi.getBooking(id!);
      setBooking(response);
      if (response.rating) {
        setRating(response.rating);
      }
      if (response.feedback) {
        setFeedback(response.feedback);
      }
    } catch (error) {
      console.log('Error fetching booking:', error);
      AlertDialog.error('Lỗi', 'Không thể tải thông tin đặt lịch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      AlertDialog.warning('Chưa đánh giá', 'Vui lòng chọn số sao đánh giá trước khi gửi');
      return;
    }

    setIsSubmitting(true);
    try {
      await bookingApi.submitFeedback(id!, {
        rating,
        feedback: feedback.trim(),
      });
      sseService.emitBookingUpdate({ id });
      AlertDialog.show({
        title: 'Cảm ơn bạn!',
        message: 'Cảm ơn bạn đã đánh giá dịch vụ của chúng tôi. Phản hồi của bạn giúp chúng tôi cải thiện chất lượng mỗi ngày.',
        variant: 'success',
        actions: [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      });
    } catch (error: any) {
      AlertDialog.error(
        'Gửi đánh giá thất bại',
        error.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVehicleInfo = () => {
    if (!booking) return '';
    if (typeof booking.vehicleId === 'object' && booking.vehicleId) {
      return booking.vehicleId.licensePlate;
    }
    return 'N/A';
  };

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 1: return 'Rất không hài lòng';
      case 2: return 'Không hài lòng';
      case 3: return 'Bình thường';
      case 4: return 'Hài lòng';
      case 5: return 'Rất hài lòng';
      default: return 'Chạm để đánh giá';
    }
  };

  const getRatingColor = (r: number) => {
    switch (r) {
      case 1: return colors.error;
      case 2: return colors.warning;
      case 3: return colors.textSecondary;
      case 4: return colors.primary;
      case 5: return colors.success;
      default: return colors.textSecondary;
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <ScreenContainer scroll padded>
      <Header
        showBack
        title="Đánh giá dịch vụ"
        variant="standard"
        onBackPress={() => router.back()}
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Icon name={Icons.success} size={28} color={colors.success} />
            </View>
            <View style={styles.infoContent}>
              <AppText variant="body" style={styles.infoTitle}>
                Dịch vụ đã hoàn thành
              </AppText>
              <AppText variant="caption" color="textSecondary">
                #{booking?._id.slice(-8).toUpperCase()}
              </AppText>
            </View>
          </View>

          {booking && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name={Icons.locationOutline} size={16} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <AppText variant="caption" color="textSecondary">
                    Chi nhánh
                  </AppText>
                  <AppText variant="body">
                    {typeof booking.branchId === 'object' ? booking.branchId.name : 'N/A'}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name={Icons.sparkle} size={16} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <AppText variant="caption" color="textSecondary">
                    Dịch vụ
                  </AppText>
                  <AppText variant="body">
                    {typeof booking.packageId === 'object' ? booking.packageId.name : 'N/A'}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name={Icons.carOutline} size={16} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <AppText variant="caption" color="textSecondary">
                    Phương tiện
                  </AppText>
                  <AppText variant="body">
                    {getVehicleInfo()}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name={Icons.calendarOutline} size={16} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <AppText variant="caption" color="textSecondary">
                    Ngày
                  </AppText>
                  <AppText variant="body">
                    {formatDate(booking.bookingDate)} - {booking.startTime}
                  </AppText>
                </View>
              </View>
            </>
          )}
        </Card>

        {/* Rating Section */}
        <Card style={styles.ratingCard}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Bạn hài lòng như thế nào?
          </AppText>
          <AppText variant="bodySmall" color="textSecondary" style={styles.sectionSubtitle}>
            Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ
          </AppText>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => setRating(star)}
                accessibilityLabel={`Đánh giá ${star} sao`}
                accessibilityRole="button"
              >
                <Icon
                  name={star <= rating ? Icons.star : Icons.starOutline}
                  size={48}
                  color={star <= rating ? colors.warning : colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.ratingText}>
            <AppText variant="body" style={{ color: getRatingColor(rating) }}>
              {getRatingLabel(rating)}
            </AppText>
          </View>
        </Card>

        {/* Feedback Text */}
        <Card style={styles.feedbackCard}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Chia sẻ thêm (tùy chọn)
          </AppText>
          <AppText variant="bodySmall" color="textSecondary" style={styles.sectionSubtitle}>
            Nói cho chúng tôi biết trải nghiệm của bạn
          </AppText>

          <View style={[styles.textInputContainer, { backgroundColor: colors.background, borderWidth: 0 }]}>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary }]}
              placeholder="Ví dụ: Nhân viên thân thiện, dịch vụ tốt..."
              placeholderTextColor={colors.textTertiary}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {feedback.length}/500
            </Text>
          </View>
        </Card>

        {/* Quick Tags */}
        <Card style={styles.tagsCard}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Đánh giá nhanh
          </AppText>
          
          <View style={styles.tagsContainer}>
            {['Nhanh chóng', 'Sạch sẽ', 'Thân thiện', 'Chuyên nghiệp', 'Giá tốt', 'Tiện lợi'].map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  feedback.includes(tag) && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  if (feedback.includes(tag)) {
                    setFeedback(feedback.replace(tag + ', ', '').replace(tag, ''));
                  } else {
                    setFeedback(feedback ? `${feedback}, ${tag}` : tag);
                  }
                }}
              >
                <Text style={[
                  styles.tagText,
                  { color: colors.textSecondary },
                  feedback.includes(tag) && { color: colors.textInverse },
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Tips */}
        <View style={[styles.tipsContainer, { backgroundColor: colors.infoLight }]}>
          <View style={styles.tipIconContainer}>
            <Icon name={Icons.bulbOutline} size={24} color={colors.info} />
          </View>
          <View style={styles.tipContent}>
            <AppText variant="bodySmall" style={styles.tipTitle}>
              Mẹo đánh giá
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.tipText}>
              - Chia sẻ trải nghiệm cụ thể{'\n'}
              - Gợi ý cải thiện (nếu có){'\n'}
              - Đánh giá 5 sao nếu bạn hài lòng!
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + spacing.sm : spacing.md }]}>
        <Button
          title="Gửi đánh giá"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={rating === 0}
          fullWidth
          size="large"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  detailContent: {
    flex: 1,
  },
  ratingCard: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  starButton: {
    paddingHorizontal: spacing.sm,
  },
  ratingText: {
    marginTop: spacing.sm,
  },
  feedbackCard: {
    marginBottom: spacing.md,
  },
  textInputContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInput: {
    ...typography.body,
    minHeight: 100,
  },
  charCount: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  tagsCard: {
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tagText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  tipsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  tipIconContainer: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  tipText: {
    lineHeight: 20,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  },
});

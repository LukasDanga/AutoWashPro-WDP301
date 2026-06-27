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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingApi } from '../../../src/api';
import { 
  Text as AppText, 
  Card, 
  Button,
  Loading,
} from '../../../src/components/common';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import type { Booking } from '../../../src/types';

export default function FeedbackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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
      console.error('Error fetching booking:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt lịch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá');
      return;
    }

    setIsSubmitting(true);
    try {
      await bookingApi.submitFeedback(id!, {
        rating,
        feedback: feedback.trim(),
      });
      Alert.alert(
        'Cảm ơn bạn!',
        'Cảm ơn bạn đã đánh giá dịch vụ của chúng tôi',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể gửi đánh giá'
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

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Đánh giá dịch vụ</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>✅</Text>
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
                <Text style={styles.detailIcon}>📍</Text>
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
                <Text style={styles.detailIcon}>✨</Text>
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
                <Text style={styles.detailIcon}>🚗</Text>
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
                <Text style={styles.detailIcon}>📅</Text>
                <View style={styles.detailContent}>
                  <AppText variant="caption" color="textSecondary">
                    Ngày
                  </AppText>
                  <AppText variant="body">
                    {booking.bookingDate} • {booking.startTime}
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
              >
                <Text style={[
                  styles.starIcon,
                  star <= rating && styles.starIconActive,
                ]}>
                  {star <= rating ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.ratingText}>
            {rating === 0 && (
              <AppText variant="body" color="textSecondary">
                Chạm để đánh giá
              </AppText>
            )}
            {rating === 1 && (
              <AppText variant="body" color="error">
                Rất không hài lòng 😠
              </AppText>
            )}
            {rating === 2 && (
              <AppText variant="body" color="warning">
                Không hài lòng 😕
              </AppText>
            )}
            {rating === 3 && (
              <AppText variant="body" color="textSecondary">
                Bình thường 😐
              </AppText>
            )}
            {rating === 4 && (
              <AppText variant="body" color="primary">
                Hài lòng 🙂
              </AppText>
            )}
            {rating === 5 && (
              <AppText variant="body" color="success">
                Rất hài lòng 😊
              </AppText>
            )}
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

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ví dụ: Nhân viên thân thiện, dịch vụ tốt..."
              placeholderTextColor={colors.textTertiary}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>
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
                  feedback.includes(tag) && styles.tagActive,
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
                  feedback.includes(tag) && styles.tagTextActive,
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={styles.tipContent}>
            <AppText variant="bodySmall" style={styles.tipTitle}>
              Mẹo đánh giá
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.tipText}>
              • Chia sẻ trải nghiệm cụ thể{'\n'}
              • Gợi ý cải thiện (nếu có){'\n'}
              • Đánh giá 5 sao nếu bạn hài lòng!
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomAction}>
        <Button
          title="Gửi đánh giá"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={rating === 0}
          fullWidth
          size="large"
        />
      </View>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 32,
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
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  detailIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
    width: 24,
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
  starIcon: {
    fontSize: 40,
    opacity: 0.3,
  },
  starIconActive: {
    opacity: 1,
  },
  ratingText: {
    marginTop: spacing.sm,
  },
  feedbackCard: {
    marginBottom: spacing.md,
  },
  textInputContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
  },
  charCount: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  tagsCard: {
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tagTextActive: {
    color: colors.textInverse,
  },
  tipsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: spacing.md,
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

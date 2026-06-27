/**
 * AutoWashPro Feedback Screen
 * App feedback form
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { 
  Text as AppText, 
  Card,
  Button,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const FEEDBACK_TYPES = [
  { id: 'bug', icon: '🐛', label: 'Báo lỗi' },
  { id: 'suggestion', icon: '💡', label: 'Đề xuất' },
  { id: 'complaint', icon: '😔', label: 'Khiếu nại' },
  { id: 'praise', icon: '😍', label: 'Khen ngợi' },
  { id: 'other', icon: '💬', label: 'Khác' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [feedbackType, setFeedbackType] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactPermission, setContactPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);

  const handleSubmit = async () => {
    if (!feedbackType) {
      Alert.alert('Thông báo', 'Vui lòng chọn loại phản hồi');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Gửi thành công!',
        'Cảm ơn bạn đã gửi phản hồi. Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất.',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Gửi phản hồi</AppText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Info Card */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoIcon}>💬</Text>
            <AppText variant="body" color="textSecondary" style={styles.infoText}>
              Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện dịch vụ. 
              Phản hồi của bạn giúp AutoWashPro ngày càng tốt hơn!
            </AppText>
          </Card>

          {/* Feedback Type */}
          <View style={styles.section}>
            <AppText variant="h4" style={styles.sectionTitle}>
              Loại phản hồi *
            </AppText>
            <View style={styles.typeGrid}>
              {FEEDBACK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    feedbackType === type.id && styles.typeCardSelected,
                  ]}
                  onPress={() => setFeedbackType(type.id)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <AppText 
                    variant="caption" 
                    style={[
                      styles.typeLabel,
                      feedbackType === type.id && styles.typeLabelSelected,
                    ]}
                  >
                    {type.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <AppText variant="h4" style={styles.sectionTitle}>
              Đánh giá tổng thể (tùy chọn)
            </AppText>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star === rating ? 0 : star)}
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
          </View>

          {/* Subject */}
          <View style={styles.section}>
            <AppText variant="h4" style={styles.sectionTitle}>
              Tiêu đề
            </AppText>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập tiêu đề ngắn gọn..."
                placeholderTextColor={colors.textTertiary}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
              <Text style={styles.charCount}>{subject.length}/100</Text>
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <AppText variant="h4" style={styles.sectionTitle}>
              Nội dung *
            </AppText>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.textInput, styles.messageInput]}
                placeholder="Mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
                placeholderTextColor={colors.textTertiary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{message.length}/1000</Text>
            </View>
          </View>

          {/* Contact Permission */}
          <TouchableOpacity 
            style={styles.permissionRow}
            onPress={() => setContactPermission(!contactPermission)}
          >
            <View style={[
              styles.checkbox,
              contactPermission && styles.checkboxChecked,
            ]}>
              {contactPermission && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.permissionContent}>
              <AppText variant="body">Cho phép liên hệ lại</AppText>
              <AppText variant="caption" color="textSecondary">
                Chúng tôi có thể liên hệ để hỏi thêm thông tin
              </AppText>
            </View>
          </TouchableOpacity>

          {/* User Info */}
          {isAuthenticated && user && (
            <Card style={styles.userInfoCard}>
              <View style={styles.userInfoRow}>
                <Text style={styles.userIcon}>👤</Text>
                <View>
                  <AppText variant="bodySmall" color="textSecondary">
                    Gửi từ tài khoản
                  </AppText>
                  <AppText variant="body">{user.name}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {user.email}
                  </AppText>
                </View>
              </View>
            </Card>
          )}

          {!isAuthenticated && (
            <Card style={styles.userInfoCard}>
              <View style={styles.userInfoRow}>
                <Text style={styles.userIcon}>👤</Text>
                <View>
                  <AppText variant="body" color="warning">
                    Đăng nhập để gửi phản hồi nhanh hơn
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    Bạn có thể tiếp tục gửi phản hồi ẩn danh
                  </AppText>
                </View>
              </View>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            title="Gửi phản hồi"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!feedbackType || !message.trim()}
            fullWidth
            size="large"
            style={styles.submitButton}
          />

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    marginBottom: spacing.md,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  infoText: {
    flex: 1,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  typeLabel: {
    color: colors.textSecondary,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  starIcon: {
    fontSize: 36,
    opacity: 0.3,
  },
  starIconActive: {
    opacity: 1,
  },
  inputContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  textInput: {
    ...typography.body,
    color: colors.textPrimary,
  },
  messageInput: {
    minHeight: 120,
  },
  charCount: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
  permissionContent: {
    flex: 1,
  },
  userInfoCard: {
    marginBottom: spacing.md,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

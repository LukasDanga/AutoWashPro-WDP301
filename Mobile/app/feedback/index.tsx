/**
 * AutoWashPro Feedback Screen
 * App feedback form with vector icons
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Text as AppText,
  Card,
  Button,
  Icon,
  Icons,
  ScreenContainer,
  Header,
  Input,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';

const FEEDBACK_TYPES = [
  { id: 'bug', icon: 'bug-outline' as const, label: 'Báo lỗi' },
  { id: 'suggestion', icon: 'bulb-outline' as const, label: 'Đề xuất' },
  { id: 'complaint', icon: 'sad-outline' as const, label: 'Khiếu nại' },
  { id: 'praise', icon: 'happy-outline' as const, label: 'Khen ngợi' },
  { id: 'other', icon: 'chatbubbles-outline' as const, label: 'Khác' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated } = useAuth();

  const [feedbackType, setFeedbackType] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactPermission, setContactPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);

  const handleSubmit = async () => {
    if (!feedbackType) {
      return;
    }
    if (!message.trim()) {
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.back();
    }, 1500);
  };

  return (
    <ScreenContainer background="subtle">
      <Header title="Gửi phản hồi" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card */}
        <Card style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Icon name="chatbubbles" size={22} color={colors.info} />
          </View>
          <AppText variant="bodySmall" color="textSecondary" style={styles.infoText}>
            Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện dịch vụ. Phản hồi của bạn
            giúp AutoWashPro ngày càng tốt hơn!
          </AppText>
        </Card>

        {/* Feedback Type */}
        <View style={styles.section}>
          <AppText variant="label" weight="600" style={styles.sectionTitle}>
            Loại phản hồi <AppText color="error">*</AppText>
          </AppText>
          <View style={styles.typeGrid}>
            {FEEDBACK_TYPES.map((type) => {
              const selected = feedbackType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: selected ? colors.primarySubtle : colors.surfaceElevated,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFeedbackType(type.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Loại phản hồi: ${type.label}`}
                  accessibilityState={{ selected }}
                >
                  <Icon
                    name={type.icon}
                    size={26}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <AppText
                    variant="caption"
                    weight={selected ? '600' : '500'}
                    color={selected ? 'primary' : 'textSecondary'}
                    style={styles.typeLabel}
                  >
                    {type.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <AppText variant="label" weight="600" style={styles.sectionTitle}>
            Đánh giá tổng thể <AppText color="textTertiary">(tùy chọn)</AppText>
          </AppText>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star === rating ? 0 : star)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} sao`}
                  accessibilityState={{ selected: active }}
                  style={styles.starBtn}
                >
                  <Icon
                    name={active ? 'star' : 'star-outline'}
                    size={36}
                    color={active ? colors.warning : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <AppText variant="label" weight="600" style={styles.sectionTitle}>
            Tiêu đề
          </AppText>
          <Input
            placeholder="Nhập tiêu đề ngắn gọn..."
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />
          <AppText variant="caption" color="textTertiary" align="right">
            {subject.length}/100
          </AppText>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <AppText variant="label" weight="600" style={styles.sectionTitle}>
            Nội dung <AppText color="error">*</AppText>
          </AppText>
          <Input
            placeholder="Mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            maxLength={1000}
            inputStyle={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          <AppText variant="caption" color="textTertiary" align="right">
            {message.length}/1000
          </AppText>
        </View>

        {/* Contact Permission */}
        <View style={styles.permissionRow}>
          <Switch
            value={contactPermission}
            onValueChange={setContactPermission}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
            accessibilityLabel="Cho phép liên hệ lại"
          />
          <View style={styles.permissionContent}>
            <AppText variant="body" weight="500">
              Cho phép liên hệ lại
            </AppText>
            <AppText variant="caption" color="textSecondary">
              Chúng tôi có thể liên hệ để hỏi thêm thông tin
            </AppText>
          </View>
        </View>

        {/* User Info */}
        {isAuthenticated && user ? (
          <Card style={styles.userInfoCard}>
            <View style={[styles.userInfoRow]}>
              <View style={[styles.userIconWrap, { backgroundColor: colors.primarySubtle }]}>
                <Icon name="person-circle-outline" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="textSecondary">
                  Gửi từ tài khoản
                </AppText>
                <AppText variant="body" weight="600">
                  {user.name}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {user.email}
                </AppText>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={[styles.userInfoCard, { backgroundColor: colors.warningLight }]}>
            <View style={styles.userInfoRow}>
              <View style={[styles.userIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                <Icon name="warning-outline" size={26} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600" color="warning">
                  Đăng nhập để gửi phản hồi nhanh hơn
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  Bạn có thể tiếp tục gửi phản hồi ẩn danh
                </AppText>
              </View>
            </View>
          </Card>
        )}

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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  typeLabel: {
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  starBtn: {
    padding: 4,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  permissionContent: {
    flex: 1,
  },
  userInfoCard: {
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
  bottomPadding: {
    height: 48,
  },
});
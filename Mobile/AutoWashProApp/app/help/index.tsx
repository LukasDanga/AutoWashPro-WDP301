/**
 * AutoWashPro Help & Support Screen
 * FAQ, contact info, and support options
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text as AppText, 
  Card,
  Button,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'Làm sao để đặt lịch rửa xe?',
    answer: 'Bạn có thể đặt lịch rửa xe bằng cách: 1) Chọn chi nhánh gần bạn, 2) Chọn gói dịch vụ phù hợp, 3) Chọn phương tiện, 4) Chọn ngày và giờ, 5) Xác nhận đặt lịch.',
  },
  {
    id: '2',
    question: 'Tôi có thể hủy đặt lịch không?',
    answer: 'Bạn có thể hủy đặt lịch trước giờ hẹn ít nhất 2 giờ. Để hủy, vào mục "Lịch sử đặt lịch" và chọn "Hủy đặt lịch".',
  },
  {
    id: '3',
    question: 'Làm sao để thanh toán?',
    answer: 'AutoWashPro hỗ trợ thanh toán qua: Tiền mặt khi đến chi nhánh, Ví MoMo, và VNPay. Bạn có thể chọn phương thức thanh toán khi xác nhận đặt lịch.',
  },
  {
    id: '4',
    question: 'Tôi quên mật khẩu, làm sao?',
    answer: 'Bạn có thể khôi phục mật khẩu bằng cách nhấn "Quên mật khẩu" trên màn hình đăng nhập và làm theo hướng dẫn.',
  },
  {
    id: '5',
    question: 'Điểm tích lũy là gì?',
    answer: 'Mỗi lần sử dụng dịch vụ, bạn sẽ tích lũy điểm dựa trên giá trị đơn hàng. Điểm có thể đổi voucher và quà tặng tại mục "Phần thưởng".',
  },
  {
    id: '6',
    question: 'Làm sao liên hệ với AutoWashPro?',
    answer: 'Bạn có thể liên hệ qua hotline 1900 xxxx, email support@autowashpro.vn, hoặc chat trực tiếp với chúng tôi.',
  },
];

interface ContactOption {
  icon: string;
  title: string;
  subtitle: string;
  action: () => void;
}

export default function HelpScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  const filteredFAQs = FAQS.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCallHotline = () => {
    Linking.openURL('tel:19001234');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@autowashpro.vn');
  };

  const handleChat = () => {
    Alert.alert(
      'Chat với chúng tôi',
      'Tính năng chat đang được phát triển. Vui lòng liên hệ qua hotline hoặc email.',
      [{ text: 'OK' }]
    );
  };

  const handleSendMessage = () => {
    if (!contactMessage.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung');
      return;
    }
    Alert.alert(
      'Gửi thành công',
      'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
      [{ text: 'OK', onPress: () => setContactMessage('') }]
    );
  };

  const contactOptions: ContactOption[] = [
    {
      icon: '📞',
      title: 'Hotline',
      subtitle: '1900 1234 (8:00 - 22:00)',
      action: handleCallHotline,
    },
    {
      icon: '✉️',
      title: 'Email',
      subtitle: 'support@autowashpro.vn',
      action: handleEmail,
    },
    {
      icon: '💬',
      title: 'Chat trực tuyến',
      subtitle: 'Phản hồi trong 5 phút',
      action: handleChat,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Trợ giúp & Hỗ trợ</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm câu hỏi..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact Options */}
        <View style={styles.section}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Liên hệ với chúng tôi
          </AppText>
          <View style={styles.contactGrid}>
            {contactOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCard}
                onPress={option.action}
              >
                <Text style={styles.contactIcon}>{option.icon}</Text>
                <AppText variant="body" style={styles.contactTitle}>
                  {option.title}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {option.subtitle}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowContactForm(!showContactForm)}
          >
            <AppText variant="h4">Gửi tin nhắn</AppText>
            <Text style={styles.expandIcon}>
              {showContactForm ? '−' : '+'}
            </Text>
          </TouchableOpacity>
          
          {showContactForm && (
            <Card style={styles.formCard}>
              <AppText variant="bodySmall" color="textSecondary" style={styles.formLabel}>
                Nội dung
              </AppText>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mô tả vấn đề của bạn..."
                  placeholderTextColor={colors.textTertiary}
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <Button
                title="Gửi"
                onPress={handleSendMessage}
                style={styles.sendButton}
              />
            </Card>
          )}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Câu hỏi thường gặp
          </AppText>
          
          {filteredFAQs.length === 0 ? (
            <Card>
              <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                Không tìm thấy câu hỏi phù hợp
              </AppText>
            </Card>
          ) : (
            filteredFAQs.map((faq) => (
              <Card key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                >
                  <Text style={[
                    styles.faqQuestionText,
                    expandedId === faq.id && styles.faqQuestionTextActive,
                  ]}>
                    {faq.question}
                  </Text>
                  <Text style={styles.faqIcon}>
                    {expandedId === faq.id ? '−' : '+'}
                  </Text>
                </TouchableOpacity>
                
                {expandedId === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </Card>
            ))
          )}
        </View>

        {/* Working Hours */}
        <View style={styles.section}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Giờ hoạt động
          </AppText>
          <Card style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursIcon}>🕐</Text>
              <View style={styles.hoursContent}>
                <AppText variant="body">Thứ 2 - Thứ 6</AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  07:00 - 21:00
                </AppText>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.hoursRow}>
              <Text style={styles.hoursIcon}>🕐</Text>
              <View style={styles.hoursContent}>
                <AppText variant="body">Thứ 7 - Chủ nhật</AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  08:00 - 20:00
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Liên kết nhanh
          </AppText>
          <View style={styles.linksGrid}>
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push('/terms' as any)}
            >
              <Text style={styles.linkIcon}>📜</Text>
              <AppText variant="caption">Điều khoản</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push('/privacy' as any)}
            >
              <Text style={styles.linkIcon}>🔒</Text>
              <AppText variant="caption">Bảo mật</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push('/about' as any)}
            >
              <Text style={styles.linkIcon}>ℹ️</Text>
              <AppText variant="caption">Về chúng tôi</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push('/settings' as any)}
            >
              <Text style={styles.linkIcon}>⚙️</Text>
              <AppText variant="caption">Cài đặt</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
  searchContainer: {
    padding: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textTertiary,
    padding: spacing.xs,
  },
  section: {
    padding: spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  expandIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  contactTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  formCard: {
    marginTop: spacing.sm,
  },
  formLabel: {
    marginBottom: spacing.sm,
  },
  textInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  textInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
  },
  sendButton: {
    marginTop: spacing.sm,
  },
  faqCard: {
    marginBottom: spacing.sm,
    padding: 0,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  faqQuestionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  faqQuestionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  faqIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  faqAnswer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  faqAnswerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  emptyText: {
    textAlign: 'center',
    padding: spacing.lg,
  },
  hoursCard: {
    gap: spacing.md,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  hoursContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  linkCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

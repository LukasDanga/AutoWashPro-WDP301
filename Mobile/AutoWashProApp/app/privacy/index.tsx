/**
 * AutoWashPro Privacy Policy Screen
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
import { 
  Text as AppText, 
  Card,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function PrivacyScreen() {
  const router = useRouter();

  const sections = [
    {
      title: '1. Giới thiệu',
      content: 'AutoWashPro ("chúng tôi", "của chúng tôi") cam kết bảo vệ quyền riêng tư của bạn. Chính sách Bảo mật này giải thích cách chúng tôi thu thập, sử dụng, tiết lộ và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng ứng dụng AutoWashPro.',
    },
    {
      title: '2. Thông tin chúng tôi thu thập',
      content: 'Chúng tôi thu thập các loại thông tin sau:\n\n• Thông tin đăng ký: tên, email, số điện thoại, mật khẩu\n• Thông tin phương tiện: biển số, loại xe, hãng xe, màu sắc\n• Thông tin giao dịch: lịch sử đặt lịch, thanh toán\n• Thông tin thiết bị: loại thiết bị, hệ điều hành, địa chỉ IP\n• Thông tin sử dụng: tương tác với ứng dụng, tính năng được sử dụng',
    },
    {
      title: '3. Cách chúng tôi sử dụng thông tin',
      content: 'Chúng tôi sử dụng thông tin của bạn để:\n\n• Cung cấp và duy trì dịch vụ\n• Xử lý đặt lịch và thanh toán\n• Gửi thông báo về đặt lịch và khuyến mãi\n• Cải thiện trải nghiệm người dùng\n• Hỗ trợ khách hàng\n• Phát hiện và ngăn chặn gian lận\n• Tuân thủ nghĩa vụ pháp lý',
    },
    {
      title: '4. Chia sẻ thông tin',
      content: 'Chúng tôi có thể chia sẻ thông tin của bạn với:\n\n• Chi nhánh AutoWashPro: để cung cấp dịch vụ rửa xe\n• Nhà cung cấp thanh toán: MoMo, VNPay để xử lý thanh toán\n• Đối tác dịch vụ: để vận hành ứng dụng\n• Cơ quan chức năng: khi được yêu cầu theo pháp luật\n\nChúng tôi không bán thông tin cá nhân của bạn cho bên thứ ba.',
    },
    {
      title: '5. Bảo mật dữ liệu',
      content: 'Chúng tôi áp dụng các biện pháp bảo mật phù hợp để bảo vệ thông tin của bạn:\n\n• Mã hóa dữ liệu trong quá trình truyền tải (SSL/TLS)\n• Lưu trữ mật khẩu dưới dạng băm (hash)\n• Kiểm soát truy cập nghiêm ngặt\n• Định kỳ đánh giá bảo mật\n\nTuy nhiên, không có phương pháp truyền tải qua Internet hoặc lưu trữ điện tử nào là hoàn toàn an toàn.',
    },
    {
      title: '6. Lưu trữ dữ liệu',
      content: 'Chúng tôi lưu trữ thông tin của bạn:\n\n• Trong thời gian bạn sử dụng tài khoản\n• Theo yêu cầu của pháp luật\n• Dữ liệu ẩn danh có thể được lưu trữ vô thời hạn cho mục đích phân tích\n\nBạn có thể yêu cầu xóa tài khoản và dữ liệu liên quan.',
    },
    {
      title: '7. Quyền của bạn',
      content: 'Bạn có các quyền sau đối với dữ liệu của mình:\n\n• Quyền truy cập: xem thông tin cá nhân\n• Quyền sửa đổi: cập nhật thông tin không chính xác\n• Quyền xóa: yêu cầu xóa tài khoản\n• Quyền phản đối: từ chối xử lý dữ liệu\n• Quyền di chuyển: nhận dữ liệu ở định dạng có thể đọc được\n\nĐể thực hiện quyền của bạn, vui lòng liên hệ support@autowashpro.vn.',
    },
    {
      title: '8. Cookies và công nghệ tương tự',
      content: 'Chúng tôi sử dụng cookies và công nghệ tương tự để:\n\n• Ghi nhớ tùy chọn của bạn\n• Phân tích cách bạn sử dụng ứng dụng\n• Cá nhân hóa nội dung và quảng cáo\n\nBạn có thể từ chối cookies trong cài đặt thiết bị, tuy nhiên điều này có thể ảnh hưởng đến một số tính năng.',
    },
    {
      title: '9. Thay đổi chính sách',
      content: 'Chúng tôi có thể cập nhật Chính sách Bảo mật này theo thời gian. Thông báo về thay đổi sẽ được đăng trên ứng dụng trước khi thay đổi có hiệu lực. Chúng tôi khuyến khích bạn xem lại chính sách này định kỳ.',
    },
    {
      title: '10. Liên hệ',
      content: 'Nếu bạn có câu hỏi về Chính sách Bảo mật này, vui lòng liên hệ:\n\n📧 Email: privacy@autowashpro.vn\n📞 Hotline: 1900 1234\n📍 Địa chỉ: [Địa chỉ công ty]\n\nChúng tôi sẽ phản hồi trong vòng 30 ngày làm việc.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Chính sách bảo mật</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.lastUpdated}>
          <AppText variant="caption" color="textSecondary">
            Cập nhật lần cuối: 01/01/2024
          </AppText>
        </View>

        <Card style={styles.introCard}>
          <AppText variant="body" color="textSecondary">
            Chúng tôi hiểu rằng việc bảo vệ thông tin cá nhân của bạn là rất quan trọng. Vui lòng đọc kỹ chính sách này để hiểu cách chúng tôi xử lý dữ liệu của bạn.
          </AppText>
        </Card>

        {sections.map((section, index) => (
          <Card key={index} style={styles.sectionCard}>
            <AppText variant="h4" style={styles.sectionTitle}>
              {section.title}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.sectionContent}>
              {section.content}
            </AppText>
          </Card>
        ))}

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
  lastUpdated: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  introCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
  },
  sectionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  sectionContent: {
    lineHeight: 22,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

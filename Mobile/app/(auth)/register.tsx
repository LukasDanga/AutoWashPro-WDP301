/**
 * AutoWashPro Register Screen
 * New user registration screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Button,
  Input,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { Header } from '../../src/components/common/Header';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ tên';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Họ tên phải có ít nhất 2 ký tự';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });
      AlertDialog.show({
        title: 'Đăng ký thành công',
        message: 'Vui lòng đăng nhập để tiếp tục sử dụng dịch vụ của AutoWashPro.',
        variant: 'success',
        actions: [
          {
            text: 'Đăng nhập ngay',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      });
    } catch (error: any) {
      const errorMessage = parseRegisterError(error);
      AlertDialog.error('Đăng ký thất bại', errorMessage);
    }
  };

  const parseRegisterError = (error: any): string => {
    if (!error.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.';
    }

    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 400:
        if (data?.errors && Array.isArray(data.errors)) {
          return data.errors.map((e: any) => `• ${e.message}`).join('\n');
        }
        return data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';

      case 409:
        const conflictField = data?.field || '';
        if (conflictField === 'email') {
          return 'Email đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.';
        }
        if (conflictField === 'phone') {
          return 'Số điện thoại đã được sử dụng. Vui lòng sử dụng số khác.';
        }
        return data?.message || 'Tài khoản đã tồn tại. Vui lòng đăng nhập.';

      case 422:
        return data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';

      case 429:
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';

      case 500:
      case 502:
      case 503:
        return 'Máy chủ đang bận. Vui lòng thử lại sau.';

      default:
        return data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding padded>
      <Header variant="large" showBack title="Tạo tài khoản" subtitle="Đăng ký để trải nghiệm dịch vụ rửa xe tốt nhất" />

      <View style={styles.formContainer}>
        <Input
          label="Họ và tên"
          placeholder="Nhập họ và tên"
          value={formData.name}
          onChangeText={(value) => updateField('name', value)}
          error={errors.name}
          autoCapitalize="words"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Email"
          placeholder="Nhập địa chỉ email"
          value={formData.email}
          onChangeText={(value) => updateField('email', value)}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Số điện thoại"
          placeholder="Nhập số điện thoại"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          error={errors.phone}
          keyboardType="phone-pad"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Mật khẩu"
          placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
          value={formData.password}
          onChangeText={(value) => updateField('password', value)}
          error={errors.password}
          secureTextEntry
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu"
          value={formData.confirmPassword}
          onChangeText={(value) => updateField('confirmPassword', value)}
          error={errors.confirmPassword}
          secureTextEntry
          containerStyle={styles.inputContainer}
        />

        <Button
          title="Đăng ký"
          onPress={handleRegister}
          loading={isLoading}
          fullWidth
          style={styles.registerButton}
        />

        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Bằng việc đăng ký, bạn đồng ý với{' '}
          <Text style={[styles.termsLink, { color: colors.primary }]}>Điều khoản sử dụng</Text> và{' '}
          <Text style={[styles.termsLink, { color: colors.primary }]}>Chính sách bảo mật</Text>
        </Text>
      </View>

      <View style={styles.loginContainer}>
        <Text style={[styles.loginText, { color: colors.textSecondary }]}>Đã có tài khoản? </Text>
        <Link href="/(auth)/login" asChild>
          <Button variant="ghost" size="small" title="Đăng nhập" />
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  termsText: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  loginText: {
    ...typography.body,
  },
});

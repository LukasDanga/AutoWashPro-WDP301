/**
 * AutoWashPro Login Screen
 * User authentication screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button, Input } from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'Vui lòng nhập email hoặc số điện thoại';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(identifier.trim(), password);
      // AuthContext will handle navigation based on auth state
    } catch (error: any) {
      // Parse detailed error message
      const errorMessage = parseLoginError(error);
      Alert.alert('Đăng nhập thất bại', errorMessage);
    }
  };

  // Parse detailed error messages from API
  const parseLoginError = (error: any): string => {
    // Network errors
    if (!error.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.';
    }

    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 400:
        return data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';

      case 401:
        // Check for specific reason
        if (data?.code === 'ACCOUNT_LOCKED') {
          return 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.';
        }
        if (data?.code === 'ACCOUNT_INACTIVE') {
          return 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.';
        }
        if (data?.code === 'WRONG_PASSWORD') {
          return 'Mật khẩu không đúng. Vui lòng thử lại.';
        }
        if (data?.code === 'USER_NOT_FOUND') {
          return 'Tài khoản không tồn tại. Vui lòng đăng ký.';
        }
        return 'Email hoặc mật khẩu không đúng.';

      case 403:
        return data?.message || 'Bạn không có quyền truy cập.';

      case 429:
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.';

      case 500:
      case 502:
      case 503:
        return 'Máy chủ đang bận. Vui lòng thử lại sau.';

      default:
        return data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>AWP</Text>
            </View>
            <Text style={styles.appName}>AutoWashPro</Text>
            <Text style={styles.tagline}>Rửa xe thông minh, tiện lợi</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Chào mừng bạn!</Text>
            <Text style={styles.subtitleText}>Đăng nhập để tiếp tục</Text>

            <Input
              label="Email hoặc Số điện thoại"
              placeholder="Nhập email hoặc số điện thoại"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (errors.identifier) setErrors({ ...errors, identifier: undefined });
              }}
              error={errors.identifier}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              secureTextEntry
              containerStyle={styles.inputContainer}
            />

            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Link href="/(auth)/forgot-password" asChild>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </Link>
            </TouchableOpacity>

            <Button
              title="Đăng nhập"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.loginButton}
            />
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    ...typography.h1,
    color: colors.textInverse,
    fontWeight: '700',
  },
  appName: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  welcomeText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitleText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.body,
    color: colors.primary,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

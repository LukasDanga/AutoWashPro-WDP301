/**
 * AutoWashPro Login Screen
 * Modern auth screen with gradient hero + focused form
 * Following UX guidelines:
 *   - accessibility, form-labels
 *   - input-labels (visible labels, not placeholder-only)
 *   - inline-validation (validate on submit, clear errors on edit)
 *   - error-placement (below field)
 *   - error-clarity (cause + recovery)
 *   - autocomplete / textContentType for autofill
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Button,
  Input,
  PressableScale,
  Icon,
  Icons,
} from '../../src/components/common';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { Header } from '../../src/components/common/Header';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

export default function LoginScreen() {
  const colors = useColors();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'Vui lòng nhập email hoặc số điện thoại';
    } else if (identifier.includes('@') && !identifier.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.identifier = 'Email không đúng định dạng';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    setServerError(null);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(identifier.trim(), password);
    } catch (error: any) {
      const errorMessage = parseLoginError(error);
      setServerError(errorMessage);
    }
  };

  const parseLoginError = (error: any): string => {
    if (!error.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.';
    }

    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 400:
        return data?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
      case 401:
        if (data?.code === 'ACCOUNT_LOCKED') {
          return 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ qua mục Trợ giúp.';
        }
        if (data?.code === 'ACCOUNT_INACTIVE') {
          return 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt.';
        }
        if (data?.code === 'WRONG_PASSWORD') {
          return 'Mật khẩu không đúng. Vui lòng thử lại hoặc đặt lại mật khẩu.';
        }
        if (data?.code === 'USER_NOT_FOUND') {
          return 'Tài khoản không tồn tại. Vui lòng đăng ký tài khoản mới.';
        }
        return 'Email hoặc mật khẩu không đúng.';
      case 403:
        return data?.message || 'Bạn không có quyền truy cập.';
      case 429:
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.';
      case 500:
      case 502:
      case 503:
        return 'Máy chủ đang bận. Vui lòng thử lại sau ít phút.';
      default:
        return data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  };

  return (
    <ScreenContainer background="gradient" scroll keyboardAvoiding>
      <Header variant="large" showBack title="AutoWashPro" subtitle="Rửa xe thông minh, tiện lợi" />

      {/* Logo in hero */}
      <View style={styles.logoWrap}>
        <LinearGradient
          colors={['#FFFFFF', '#E3F2FD']}
          style={styles.logoContainer}
        >
          <Text style={[styles.logoText, { color: colors.primary }]}>AWP</Text>
        </LinearGradient>
      </View>

      {/* Content section */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.welcomeText, { color: colors.textPrimary }]}>Chào mừng bạn!</Text>
        <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>Đăng nhập để tiếp tục</Text>

        {serverError ? (
          <View
            style={[styles.serverErrorWrap, { backgroundColor: colors.errorLight }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Icon name={Icons.error} size={18} color={colors.error} />
            <Text style={[styles.serverErrorText, { color: colors.error }]}>{serverError}</Text>
          </View>
        ) : null}

        <Input
          label="Email hoặc Số điện thoại"
          placeholder="Nhập email hoặc số điện thoại"
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            if (errors.identifier) {
              setErrors({ ...errors, identifier: undefined });
            }
            if (serverError) setServerError(null);
          }}
          error={errors.identifier}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          containerStyle={styles.inputContainer}
          leftIcon={
            <Icon name={Icons.mailOutline} size={20} color={colors.textSecondary} />
          }
        />

        <Input
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) {
              setErrors({ ...errors, password: undefined });
            }
            if (serverError) setServerError(null);
          }}
          error={errors.password}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          containerStyle={styles.inputContainer}
          leftIcon={
            <Icon name={Icons.lockOutline} size={20} color={colors.textSecondary} />
          }
          rightIcon={
            <Icon
              name={showPassword ? Icons.eyeOffOutline : Icons.eyeOutline}
              size={20}
              color={colors.textSecondary}
            />
          }
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <PressableScale
            style={styles.forgotPasswordContainer}
            accessibilityRole="link"
            accessibilityLabel="Quên mật khẩu"
          >
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Quên mật khẩu?</Text>
          </PressableScale>
        </Link>

        <Button
          title="Đăng nhập"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
          size="large"
          style={styles.loginButton}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>Hoặc</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
        </View>

        {/* Social login buttons (placeholder) */}
        <Button
          title="Tiếp tục với Google"
          variant="outline"
          icon={
            <Icon name={Icons.chatOutline} size={18} color={colors.textPrimary} />
          }
          onPress={() => {}}
          fullWidth
          style={styles.socialButton}
        />
        <Button
          title="Tiếp tục với Facebook"
          variant="outline"
          icon={
            <Icon name={Icons.chatOutline} size={18} color={colors.textPrimary} />
          }
          onPress={() => {}}
          fullWidth
          style={styles.socialButton}
        />

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>Chưa có tài khoản? </Text>
          <Link href="/(auth)/register" asChild>
            <PressableScale accessibilityRole="link" accessibilityLabel="Đăng ký ngay">
              <Text style={[styles.registerLink, { color: colors.primary }]}>Đăng ký ngay</Text>
            </PressableScale>
          </Link>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: 'center',
    marginTop: -spacing.xl,
    marginBottom: spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -spacing.lg,
  },
  welcomeText: {
    ...typography.h2,
    marginBottom: spacing.xs,
    fontWeight: '800',
  },
  subtitleText: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginVertical: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.md,
    fontWeight: '500',
  },
  socialButton: {
    marginBottom: spacing.sm,
  },
  serverErrorWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  serverErrorText: {
    flex: 1,
    ...typography.caption,
    fontWeight: '500',
    lineHeight: 18,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  registerText: {
    ...typography.body,
  },
  registerLink: {
    ...typography.body,
    fontWeight: '700',
  },
});

/**
 * AutoWashPro Forgot Password Screen
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
import { authApi } from '../../src/api/auth';
import { Button, Input } from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState(0);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setErrors({ email: 'Vui lòng nhập email' });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ email: 'Email không hợp lệ' });
      return;
    }

    setIsLoading(true);
    try {
      // Note: Backend needs to implement this endpoint
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('otp');
      setCountdown(60);
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gửi mã OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) {
      setErrors({ otp: 'Vui lòng nhập mã OTP gồm 6 chữ số' });
      return;
    }

    setIsLoading(true);
    try {
      // Note: Backend needs to implement this endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('reset');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Mã OTP không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Note: Backend needs to implement this endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Thành công',
        'Mật khẩu đã được đặt lại. Vui lòng đăng nhập với mật khẩu mới.',
        [
          {
            text: 'Đăng nhập',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = () => {
    if (countdown === 0) {
      handleSendOTP();
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
          {/* Header */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (step === 'otp') setStep('email');
              else if (step === 'reset') setStep('otp');
              else router.back();
            }}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>🔑</Text>
            </View>
            <Text style={styles.title}>
              {step === 'email' && 'Quên mật khẩu'}
              {step === 'otp' && 'Nhập mã OTP'}
              {step === 'reset' && 'Đặt mật khẩu mới'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' && 'Nhập email đã đăng ký để nhận mã OTP'}
              {step === 'otp' && `Nhập mã OTP đã gửi đến ${email}`}
              {step === 'reset' && 'Nhập mật khẩu mới cho tài khoản của bạn'}
            </Text>
          </View>

          {/* Step 1: Email */}
          {step === 'email' && (
            <View style={styles.formContainer}>
              <Input
                label="Email"
                placeholder="Nhập địa chỉ email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.inputContainer}
              />

              <Button
                title="Gửi mã OTP"
                onPress={handleSendOTP}
                loading={isLoading}
                fullWidth
              />
            </View>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <View style={styles.formContainer}>
              <Input
                label="Mã OTP"
                placeholder="Nhập mã 6 chữ số"
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                  if (errors.otp) setErrors({ ...errors, otp: '' });
                }}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={6}
                containerStyle={styles.inputContainer}
              />

              <Button
                title="Xác minh"
                onPress={handleVerifyOTP}
                loading={isLoading}
                fullWidth
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Không nhận được mã? </Text>
                <TouchableOpacity onPress={resendOTP} disabled={countdown > 0}>
                  <Text style={[
                    styles.resendLink,
                    countdown > 0 && styles.resendLinkDisabled
                  ]}>
                    {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Reset Password */}
          {step === 'reset' && (
            <View style={styles.formContainer}>
              <Input
                label="Mật khẩu mới"
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                }}
                error={errors.newPassword}
                secureTextEntry
                containerStyle={styles.inputContainer}
              />

              <Input
                label="Xác nhận mật khẩu"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                error={errors.confirmPassword}
                secureTextEntry
                containerStyle={styles.inputContainer}
              />

              <Button
                title="Đặt lại mật khẩu"
                onPress={handleResetPassword}
                loading={isLoading}
                fullWidth
              />
            </View>
          )}

          {/* Back to Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Nhớ mật khẩu? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Đăng nhập</Text>
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
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 24,
    color: colors.primary,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resendLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: colors.textTertiary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: spacing.xl,
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

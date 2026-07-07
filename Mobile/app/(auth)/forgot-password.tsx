/**
 * AutoWashPro Forgot Password Screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  Button,
  Input,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { Header } from '../../src/components/common/Header';
import { Icon, Icons } from '../../src/components/common/Icon';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();

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
      toast.success('Đã gửi mã OTP', 'Vui lòng kiểm tra email của bạn');

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
      AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể gửi mã OTP');
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
      AlertDialog.error('Mã OTP không hợp lệ', error.response?.data?.message || 'Vui lòng kiểm tra lại mã OTP');
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

      AlertDialog.show({
        title: 'Đặt lại mật khẩu thành công',
        message: 'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập với mật khẩu mới.',
        variant: 'success',
        actions: [
          {
            text: 'Đăng nhập',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      });
    } catch (error: any) {
      AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') setStep('email');
    else if (step === 'reset') setStep('otp');
    else router.back();
  };

  const resendOTP = () => {
    if (countdown === 0) {
      handleSendOTP();
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'email': return 'Quên mật khẩu';
      case 'otp': return 'Nhập mã OTP';
      case 'reset': return 'Đặt mật khẩu mới';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'email': return 'Nhập email đã đăng ký để nhận mã OTP';
      case 'otp': return `Nhập mã OTP đã gửi đến ${email}`;
      case 'reset': return 'Nhập mật khẩu mới cho tài khoản của bạn';
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding padded>
      <Header 
        variant="large" 
        showBack 
        title={getTitle()} 
        subtitle={getSubtitle()}
        onBackPress={handleBack}
      />

      {/* Icon Container */}
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Icon name={Icons.lockOutline} size={36} color={colors.primary} />
        </View>
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
            <Text style={[styles.resendText, { color: colors.textSecondary }]}>Không nhận được mã? </Text>
            <Button 
              variant="ghost" 
              size="small" 
              title={countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
              onPress={resendOTP} 
              disabled={countdown > 0}
            />
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
        <Text style={[styles.loginText, { color: colors.textSecondary }]}>Nhớ mật khẩu? </Text>
        <Link href="/(auth)/login" asChild>
          <Button variant="ghost" size="small" title="Đăng nhập" />
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
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

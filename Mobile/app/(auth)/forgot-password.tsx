import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AlertDialog, Button, Input, Text } from '../../src/components/common';
import { authApi } from '../../src/api';
import { colors } from '../../src/theme/colors';

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
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const updateError = useCallback((field: string, msg: string) => {
    setErrors(prev => ({ ...prev, [field]: msg }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const e = { ...prev };
      delete e[field];
      return e;
    });
  }, []);

  const validateEmail = (val: string): boolean => {
    if (!val.trim()) {
      updateError('email', 'Vui lòng nhập email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      updateError('email', 'Email không hợp lệ');
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateEmail(email)) return;
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('otp');
      setCountdown(60);
      AlertDialog.show({
        title: 'Đã gửi mã OTP',
        message: 'Vui lòng kiểm tra email của bạn để nhận mã xác minh.',
        actions: [{ text: 'Đóng' }]
      });
    } catch (error: any) {
      const fallback = 'Không thể gửi mã OTP. Vui lòng thử lại.';
      AlertDialog.error('Lỗi', error?.response?.data?.message || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) {
      updateError('otp', 'Vui lòng nhập mã OTP gồm 6 chữ số');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(email.trim(), otp.trim());
      if (res?.valid) {
        setStep('reset');
      } else {
        AlertDialog.error('OTP không hợp lệ', 'Vui lòng kiểm tra lại mã OTP');
      }
    } catch (error: any) {
      const fallback = 'Không thể xác minh mã OTP.';
      AlertDialog.error('OTP không hợp lệ', error?.response?.data?.message || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const e: Record<string, string> = {};
    if (!newPassword) e.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (newPassword.length < 6) e.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (newPassword !== confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      AlertDialog.show({
        title: 'Thành công',
        message: 'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập với mật khẩu mới.',
        variant: 'success',
        actions: [
          {
            text: 'Đăng nhập ngay',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      });
    } catch (error: any) {
      const fallback = 'Không thể đặt lại mật khẩu.';
      AlertDialog.error('Lỗi', error?.response?.data?.message || fallback);
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

  const renderEmailStep = () => (
    <>
      <Input
        ref={emailRef as any}
        label="Email đăng ký"
        placeholder="Nhập email của bạn"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(v) => { setEmail(v); clearError('email'); }}
        error={errors.email}
        returnKeyType="done"
        onSubmitEditing={handleSendOTP}
      />
      <View style={s.actions}>
        <Button
          title="Gửi mã OTP"
          size="large"
          fullWidth
          loading={isLoading}
          onPress={handleSendOTP}
        />
      </View>
    </>
  );

  const renderOtpStep = () => (
    <>
      <Input
        ref={otpRef as any}
        label={`Mã OTP (Gửi tới ${email})`}
        placeholder="Nhập mã 6 chữ số"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, '')); clearError('otp'); }}
        error={errors.otp}
        returnKeyType="done"
        onSubmitEditing={handleVerifyOTP}
      />
      <View style={{ alignItems: 'flex-start', marginTop: -4, marginBottom: 16 }}>
        <TouchableOpacity onPress={resendOTP} disabled={countdown > 0} style={{ paddingVertical: 4 }}>
          <Text variant="bodySmall" weight="600" style={{ color: countdown > 0 ? colors.textTertiary : colors.primary }}>
            {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã OTP'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={s.actions}>
        <Button
          title="Xác minh OTP"
          size="large"
          fullWidth
          loading={isLoading}
          onPress={handleVerifyOTP}
        />
      </View>
    </>
  );

  const renderResetStep = () => (
    <>
      <Input
        ref={passwordRef as any}
        label="Mật khẩu mới"
        placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
        secureTextEntry
        autoCapitalize="none"
        value={newPassword}
        onChangeText={(v) => { setNewPassword(v); clearError('newPassword'); }}
        error={errors.newPassword}
        returnKeyType="next"
      />
      <Input
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu mới"
        secureTextEntry
        autoCapitalize="none"
        value={confirmPassword}
        onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
        error={errors.confirmPassword}
        returnKeyType="done"
        onSubmitEditing={handleResetPassword}
      />
      <View style={s.actions}>
        <Button
          title="Đặt lại mật khẩu"
          size="large"
          fullWidth
          loading={isLoading}
          onPress={handleResetPassword}
        />
      </View>
    </>
  );

  const getHeading = () => {
    switch(step) {
      case 'email': return { title: 'Quên mật khẩu', subtitle: 'Nhập email đã đăng ký để nhận mã khôi phục.' };
      case 'otp': return { title: 'Xác minh OTP', subtitle: 'Vui lòng nhập mã vừa được gửi đến email của bạn.' };
      case 'reset': return { title: 'Mật khẩu mới', subtitle: 'Tạo mật khẩu mới cho tài khoản của bạn.' };
    }
  };

  const { title, subtitle } = getHeading();

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {/* Top bar */}
          <View style={s.topbar}>
            <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          {/* Heading */}
          <View style={s.heading}>
            <Text variant="h2" weight="700" style={s.title}>{title}</Text>
            <Text variant="body" color="textSecondary" style={s.subtitle}>{subtitle}</Text>
          </View>

          {/* Content */}
          {step === 'email' && renderEmailStep()}
          {step === 'otp' && renderOtpStep()}
          {step === 'reset' && renderResetStep()}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  scroll:     { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  // Top bar
  topbar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, marginTop: 4 },
  backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceDark, justifyContent: 'center', alignItems: 'center' },

  // Heading
  heading:    { marginTop: 24, marginBottom: 32 },
  title:      { letterSpacing: -0.5, marginBottom: 10 },
  subtitle:   { lineHeight: 24 },

  // Bottom actions
  actions:    { marginTop: 16 },
});

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
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
import { AlertDialog } from '../../src/components/common';
import { authApi } from '../../src/api';

const C = {
  brand:      '#2563EB',
  bg:         '#FFFFFF',
  bgInput:    '#F8FAFC',
  border:     '#E2E8F0',
  textPrimary:'#0F172A',
  textBody:   '#475569',
  textMuted:  '#94A3B8',
  textLabel:  '#334155',
  error:      '#EF4444',
  errorBg:    '#FEF2F2',
  divider:    '#F1F5F9',
};

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
      <StableField label="Email đăng ký" error={errors.email}>
        <TextInput
          ref={emailRef}
          style={[s.textInput, !!errors.email && s.inputError]}
          placeholder="Nhập email của bạn"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(v) => { setEmail(v); clearError('email'); }}
          returnKeyType="done"
          onSubmitEditing={handleSendOTP}
        />
      </StableField>
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.cta, isLoading && s.ctaDisabled]}
          onPress={handleSendOTP}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaText}>Gửi mã OTP</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderOtpStep = () => (
    <>
      <StableField label={`Mã OTP (Gửi tới ${email})`} error={errors.otp}>
        <TextInput
          ref={otpRef}
          style={[s.textInput, !!errors.otp && s.inputError]}
          placeholder="Nhập mã 6 chữ số"
          placeholderTextColor={C.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, '')); clearError('otp'); }}
          returnKeyType="done"
          onSubmitEditing={handleVerifyOTP}
        />
      </StableField>
      <View style={{ alignItems: 'flex-start', marginTop: -4, marginBottom: 16 }}>
        <TouchableOpacity onPress={resendOTP} disabled={countdown > 0} style={{ paddingVertical: 4 }}>
          <Text style={{ color: countdown > 0 ? C.textMuted : C.brand, fontWeight: '600', fontSize: 13 }}>
            {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã OTP'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.cta, isLoading && s.ctaDisabled]}
          onPress={handleVerifyOTP}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaText}>Xác minh OTP</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderResetStep = () => (
    <>
      <StableField label="Mật khẩu mới" error={errors.newPassword}>
        <View style={s.rowInput}>
          <TextInput
            ref={passwordRef}
            style={[s.textInput, s.textInputFlex, !!errors.newPassword && s.inputError]}
            placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
            placeholderTextColor={C.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); clearError('newPassword'); }}
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={s.eyeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </StableField>

      <StableField label="Xác nhận mật khẩu" error={errors.confirmPassword}>
        <TextInput
          style={[s.textInput, !!errors.confirmPassword && s.inputError]}
          placeholder="Nhập lại mật khẩu mới"
          placeholderTextColor={C.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
        />
      </StableField>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.cta, isLoading && s.ctaDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaText}>Đặt lại mật khẩu</Text>}
        </TouchableOpacity>
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
              <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          {/* Heading */}
          <View style={s.heading}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.subtitle}>{subtitle}</Text>
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

// ─── StableField: wrapper tĩnh, KHÔNG có state ─────────────────────────────
function StableField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputBox, !!error && s.inputBoxError]}>
        {children}
      </View>
      {error ? <Text style={s.errMsg}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  scroll:     { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  // Top bar
  topbar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, marginTop: 4 },
  backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  // Heading
  heading:    { marginTop: 24, marginBottom: 32 },
  title:      { fontSize: 32, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 10 },
  subtitle:   { fontSize: 15, color: C.textBody, lineHeight: 24 },

  // Field
  fieldWrap:  { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textLabel, marginBottom: 8, letterSpacing: 0.1 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: C.bgInput,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 16,
  },
  inputBoxError: { borderColor: C.error, backgroundColor: C.errorBg },

  textInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontWeight: '500',
    color: C.textPrimary,
    paddingVertical: 0,
  },
  textInputFlex: { flex: 1 },
  inputError: { color: C.error },

  rowInput:   { flex: 1, flexDirection: 'row', alignItems: 'center' },
  eyeBtn:     { marginLeft: 10, padding: 4 },
  errMsg:     { marginTop: 6, marginLeft: 4, fontSize: 12, fontWeight: '500', color: C.error, lineHeight: 16 },

  // Bottom actions
  actions:    { marginTop: 16 },
  cta: {
    height: 56,
    backgroundColor: C.brand,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaDisabled:  { opacity: 0.7, shadowOpacity: 0, elevation: 0 },
  ctaText:      { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});

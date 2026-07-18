import React, { useState, useRef, useCallback } from 'react';
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
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { AlertDialog } from '../../src/components/common';

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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Refs cho từng field để tránh re-render khi chuyển focus
  const nameRef        = useRef<TextInput>(null);
  const phoneRef       = useRef<TextInput>(null);
  const emailRef       = useRef<TextInput>(null);
  const passwordRef    = useRef<TextInput>(null);
  const confirmRef     = useRef<TextInput>(null);

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev[field] ? { ...prev, [field]: '' } : prev);
  }, []);

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())
      e.name = 'Vui lòng nhập họ tên';
    else if (formData.name.trim().length < 2)
      e.name = 'Họ tên phải có ít nhất 2 ký tự';
    if (!formData.email.trim())
      e.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Email không hợp lệ';
    if (!formData.phone.trim())
      e.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, '')))
      e.phone = 'Số điện thoại không hợp lệ';
    if (!formData.password)
      e.password = 'Vui lòng nhập mật khẩu';
    else if (formData.password.length < 6)
      e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
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
        message: 'Vui lòng đăng nhập để tiếp tục sử dụng dịch vụ.',
        variant: 'success',
        actions: [{ text: 'Đăng nhập ngay', onPress: () => router.replace('/(auth)/login') }],
      });
    } catch (error: any) {
      AlertDialog.error('Đăng ký thất bại', parseError(error));
    }
  };

  const parseError = (error: any): string => {
    if (!error.response) return 'Không thể kết nối. Vui lòng kiểm tra internet.';
    const { status, data } = error.response;
    switch (status) {
      case 400:
        if (data?.errors && Array.isArray(data.errors))
          return data.errors.map((e: any) => `• ${e.message}`).join('\n');
        return data?.message || 'Dữ liệu không hợp lệ.';
      case 409:
        if (data?.field === 'email') return 'Email đã được sử dụng.';
        if (data?.field === 'phone') return 'Số điện thoại đã được sử dụng.';
        return data?.message || 'Tài khoản đã tồn tại.';
      case 422: return data?.message || 'Dữ liệu không hợp lệ.';
      case 429: return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
      case 500: case 502: case 503: return 'Máy chủ đang bận. Vui lòng thử lại sau.';
      default: return data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Top bar */}
          <View style={s.topbar}>
            {router.canGoBack() ? (
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
            <Text style={s.logoText}>AutoWashPro</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Heading */}
          <View style={s.heading}>
            <Text style={s.title}>Tạo tài khoản</Text>
            <Text style={s.subtitle}>
              Bắt đầu hành trình chăm sóc xế yêu của bạn cùng AutoWashPro.
            </Text>
          </View>

          {/* Form */}
          <StableField label="Họ và tên" error={errors.name}>
            <TextInput
              ref={nameRef}
              style={[s.textInput, !!errors.name && s.inputError]}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={C.textMuted}
              value={formData.name}
              onChangeText={v => updateField('name', v)}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              blurOnSubmit={false}
            />
          </StableField>

          <StableField label="Số điện thoại" error={errors.phone}>
            <TextInput
              ref={phoneRef}
              style={[s.textInput, !!errors.phone && s.inputError]}
              placeholder="0901 234 567"
              placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={v => updateField('phone', v)}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          </StableField>

          <StableField label="Email" error={errors.email}>
            <TextInput
              ref={emailRef}
              style={[s.textInput, !!errors.email && s.inputError]}
              placeholder="example@gmail.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={v => updateField('email', v)}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </StableField>

          <StableField label="Mật khẩu" error={errors.password}>
            <View style={s.rowInput}>
              <TextInput
                ref={passwordRef}
                style={[s.textInput, s.textInputFlex, !!errors.password && s.inputError]}
                placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={formData.password}
                onChangeText={v => updateField('password', v)}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                style={s.eyeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </StableField>

          <StableField label="Xác nhận mật khẩu" error={errors.confirmPassword}>
            <View style={s.rowInput}>
              <TextInput
                ref={confirmRef}
                style={[s.textInput, s.textInputFlex, !!errors.confirmPassword && s.inputError]}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                value={formData.confirmPassword}
                onChangeText={v => updateField('confirmPassword', v)}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(p => !p)}
                style={s.eyeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </StableField>

          {/* Bottom actions (inside scroll so keyboard doesn't cover them) */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.cta, isLoading && s.ctaDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.ctaText}>Tiếp tục</Text>
              }
            </TouchableOpacity>

            <Text style={s.footerNote}>
              Đã có tài khoản?{' '}
              <Link href="/(auth)/login" asChild>
                <Text style={s.footerLink}>Đăng nhập ngay</Text>
              </Link>
            </Text>
          </View>
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
  logoText:   { fontSize: 18, fontWeight: '700', color: C.brand, letterSpacing: -0.2 },

  // Heading
  heading:    { marginTop: 24, marginBottom: 32 },
  title:      { fontSize: 30, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 10 },
  subtitle:   { fontSize: 15, color: C.textBody, lineHeight: 24 },

  // Field
  fieldWrap:  { marginBottom: 16 },
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

  // TextInput — KHÔNG dùng flex:1 trực tiếp trong inputBox để tránh layout shift
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
  actions:    { marginTop: 24, paddingBottom: 16 },
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
  footerNote:   { marginTop: 20, textAlign: 'center', fontSize: 14, fontWeight: '500', color: C.textBody },
  footerLink:   { color: C.brand, fontWeight: '700' },
});

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
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev[field] ? { ...prev, [field]: '' } : prev);
  }, []);

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.email.trim())
      e.email = 'Vui lòng nhập email hoặc số điện thoại';
    else if (formData.email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Email không hợp lệ';
    if (!formData.password)
      e.password = 'Vui lòng nhập mật khẩu';
    else if (formData.password.length < 6)
      e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    try {
      await login(formData.email.trim(), formData.password);
    } catch (error: any) {
      AlertDialog.error('Đăng nhập thất bại', parseLoginError(error));
    }
  };

  const parseLoginError = (error: any): string => {
    if (!error.response) return 'Không thể kết nối. Vui lòng kiểm tra internet và thử lại.';
    const { status, data } = error.response;
    switch (status) {
      case 400: return data?.message || 'Dữ liệu không hợp lệ.';
      case 401:
        if (data?.code === 'ACCOUNT_LOCKED') return 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.';
        if (data?.code === 'ACCOUNT_INACTIVE') return 'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email.';
        return 'Email hoặc mật khẩu không chính xác.';
      case 429: return 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.';
      case 500: case 502: case 503: return 'Máy chủ đang bận. Vui lòng thử lại sau ít phút.';
      default: return data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      if (idToken) {
        await loginWithGoogle(idToken);
      }
    } catch (error: any) {
      console.log('Google login error:', error);
      if (error.code !== 'ASYNC_OP_IN_PROGRESS' && error.code !== 'SIGN_IN_CANCELLED') {
        AlertDialog.error('Đăng nhập thất bại', 'Không thể kết nối với Google. Vui lòng thử lại.');
      }
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
            {router.canGoBack() && (
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Heading */}
          <View style={s.heading}>
            <Text style={s.title}>Chào mừng trở lại</Text>
            <Text style={s.subtitle}>
              Đăng nhập để tiếp tục quản lý dịch vụ chăm sóc xế yêu của bạn
            </Text>
          </View>

          {/* Form */}
          <StableField label="Email hoặc Số điện thoại" error={errors.email}>
            <TextInput
              ref={emailRef}
              style={s.textInput}
              placeholder="Nhập email hoặc số điện thoại"
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
                style={[s.textInput, s.textInputFlex]}
                placeholder="Nhập mật khẩu của bạn"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={formData.password}
                onChangeText={v => updateField('password', v)}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

          <TouchableOpacity 
            style={s.forgot} 
            activeOpacity={0.7}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={s.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.cta, isLoading && s.ctaDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.ctaText}>Đăng nhập</Text>
              }
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              <Text style={{ marginHorizontal: 10, color: C.textMuted, fontSize: 13, fontWeight: '600' }}>HOẶC</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            </View>

            <TouchableOpacity
              style={[s.cta, { backgroundColor: '#FFF', borderWidth: 1, borderColor: C.border }, isLoading && s.ctaDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
                <Text style={[s.ctaText, { color: C.textLabel }]}>Đăng nhập bằng Google</Text>
              </View>
            </TouchableOpacity>

            <Text style={s.footerNote}>
              Chưa có tài khoản?{' '}
              <Link href="/(auth)/register" asChild>
                <Text style={s.footerLink}>Đăng ký ngay</Text>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Wrapper tĩnh — KHÔNG có state để tránh re-render gây nhảy focus
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
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  topbar:  { height: 56, marginTop: 4, justifyContent: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  heading:  { marginTop: 32, marginBottom: 40 },
  title:    { fontSize: 32, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 12 },
  subtitle: { fontSize: 15, color: C.textBody, lineHeight: 24 },

  fieldWrap:    { marginBottom: 20 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: C.textLabel, marginBottom: 8, letterSpacing: 0.1 },
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
  rowInput: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  eyeBtn:   { marginLeft: 10, padding: 4 },
  errMsg:   { marginTop: 6, marginLeft: 4, fontSize: 12, fontWeight: '500', color: C.error, lineHeight: 16 },

  forgot:     { alignSelf: 'flex-start', marginTop: -4, marginBottom: 8, paddingVertical: 8 },
  forgotText: { color: C.brand, fontWeight: '600', fontSize: 14 },

  actions:     { marginTop: 32 },
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
  ctaDisabled: { opacity: 0.7, shadowOpacity: 0, elevation: 0 },
  ctaText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  footerNote:  { marginTop: 20, textAlign: 'center', fontSize: 14, fontWeight: '500', color: C.textBody },
  footerLink:  { color: C.brand, fontWeight: '700' },
});

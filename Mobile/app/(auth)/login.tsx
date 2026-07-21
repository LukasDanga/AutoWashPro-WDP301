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
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../src/contexts/AuthContext';
import { AlertDialog, GoogleLogo } from '../../src/components/common';
import { colors } from '../../src/theme/colors';

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

  const renderContent = () => (
    <>
      {/* Top bar */}
      <View style={s.topbar}>
        {router.canGoBack() && (
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Heading */}
      <View style={s.heading}>
        <Text style={s.title}>Đăng nhập</Text>
        <Text style={s.subtitle}>
          Rất vui được gặp lại bạn! Vui lòng nhập thông tin để tiếp tục.
        </Text>
      </View>

      {/* Form */}
      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>Email / Số điện thoại</Text>
        <View style={[s.inputBox, !!errors.email && s.inputBoxError]}>
          <TextInput
            ref={emailRef}
            style={s.textInput}
            placeholder="Nhập email hoặc số điện thoại"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={v => updateField('email', v)}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.email ? <Text style={s.errMsg}>{errors.email}</Text> : null}
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>Mật khẩu</Text>
        <View style={[s.inputBox, !!errors.password && s.inputBoxError]}>
          <View style={s.rowInput}>
            <TextInput
              ref={passwordRef}
              style={[s.textInput, s.textInputFlex]}
              placeholder="Nhập mật khẩu của bạn"
              placeholderTextColor={colors.textTertiary}
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
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
        {errors.password ? <Text style={s.errMsg}>{errors.password}</Text> : null}
      </View>

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
          <LinearGradient
            colors={[colors.primary, colors.primaryDark] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.ctaGradient}
          >
            {/* Decorative blob for depth */}
            <View style={s.ctaBlob} />
            {isLoading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.ctaText}>Đăng nhập</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.dividerWrap}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>HOẶC</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          style={[s.googleBtn, isLoading && s.ctaDisabled]}
          onPress={handleGoogleLogin}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <GoogleLogo size={22} />
          <Text style={s.googleBtnText}>Đăng nhập bằng Google</Text>
        </TouchableOpacity>

        <Text style={s.footerNote}>
          Chưa có tài khoản?{' '}
          <Link href="/(auth)/register" asChild>
            <Text style={s.footerLink}>Đăng ký ngay</Text>
          </Link>
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {renderContent()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 60 },

  topbar: { height: 44, justifyContent: 'center', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceDark, justifyContent: 'center', alignItems: 'center' },

  heading: { marginBottom: 40 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 36, color: colors.textPrimary, letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontFamily: 'Outfit_400Regular', fontSize: 16, color: colors.textSecondary, lineHeight: 24 },

  fieldWrap: { marginBottom: 24 },
  fieldLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 10 },
  
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inputBoxError: { 
    borderColor: colors.error, 
    backgroundColor: colors.errorLight 
  },
  
  textInput: {
    fontFamily: 'Outfit_500Medium',
    flex: 1,
    height: 60,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  textInputFlex: { flex: 1 },
  rowInput: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { marginLeft: 10, padding: 4 },
  errMsg: { fontFamily: 'Outfit_500Medium', marginTop: 8, marginLeft: 4, fontSize: 13, color: colors.error },

  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 32, paddingVertical: 8 },
  forgotText: { fontFamily: 'Outfit_600SemiBold', color: colors.primary, fontSize: 15 },

  actions: { marginTop: 8 },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaGradient: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -60,
    right: -40,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontFamily: 'Outfit_700Bold', color: '#FFFFFF', fontSize: 17, letterSpacing: 0.2 },
  
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 16, color: colors.textTertiary, fontSize: 13, fontFamily: 'Outfit_700Bold' },

  googleBtn: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  googleBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  
  footerNote: { fontFamily: 'Outfit_400Regular', marginTop: 32, textAlign: 'center', fontSize: 15, color: colors.textSecondary },
  footerLink: { fontFamily: 'Outfit_700Bold', color: colors.primary },
});

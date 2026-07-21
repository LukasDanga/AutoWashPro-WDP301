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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loginWithGoogle, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const nameRef        = useRef<TextInput>(null);
  const emailRef       = useRef<TextInput>(null);
  const phoneRef       = useRef<TextInput>(null);
  const passwordRef    = useRef<TextInput>(null);

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
    if (formData.phone.trim() && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, '')))
      e.phone = 'Số điện thoại không hợp lệ';
    if (!formData.password)
      e.password = 'Vui lòng nhập mật khẩu';
    else if (formData.password.length < 6)
      e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() ? formData.phone.trim() : undefined,
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
        {router.canGoBack() ? (
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <Text style={s.logoText}>AutoWashPro</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Heading */}
      <View style={s.heading}>
        <Text style={s.title}>Tạo tài khoản</Text>
        <Text style={s.subtitle}>
          Bắt đầu hành trình chăm sóc xế yêu của bạn cùng AutoWashPro.
        </Text>
      </View>

      {/* Form */}
      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>Họ và tên</Text>
        <View style={[s.inputBox, !!errors.name && s.inputBoxError]}>
          <TextInput
            ref={nameRef}
            style={s.textInput}
            placeholder="Vd: Nguyễn Văn A"
            placeholderTextColor={colors.textTertiary}
            value={formData.name}
            onChangeText={v => updateField('name', v)}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.name ? <Text style={s.errMsg}>{errors.name}</Text> : null}
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>Email</Text>
        <View style={[s.inputBox, !!errors.email && s.inputBoxError]}>
          <TextInput
            ref={emailRef}
            style={s.textInput}
            placeholder="example@gmail.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={v => updateField('email', v)}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.email ? <Text style={s.errMsg}>{errors.email}</Text> : null}
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>Số điện thoại</Text>
        <View style={[s.inputBox, !!errors.phone && s.inputBoxError]}>
          <TextInput
            ref={phoneRef}
            style={s.textInput}
            placeholder="09xx xxx xxx"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={v => updateField('phone', v)}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.phone ? <Text style={s.errMsg}>{errors.phone}</Text> : null}
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>Mật khẩu</Text>
        <View style={[s.inputBox, !!errors.password && s.inputBoxError]}>
          <View style={s.rowInput}>
            <TextInput
              ref={passwordRef}
              style={[s.textInput, s.textInputFlex]}
              placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={formData.password}
              onChangeText={v => updateField('password', v)}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
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

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.cta, isLoading && s.ctaDisabled]}
          onPress={handleRegister}
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
              : <Text style={s.ctaText}>Đăng ký ngay</Text>
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
          <Text style={s.googleBtnText}>Tiếp tục với Google</Text>
        </TouchableOpacity>

        <Text style={s.footerNote}>
          Đã có tài khoản?{' '}
          <Link href="/(auth)/login" asChild>
            <Text style={s.footerLink}>Đăng nhập</Text>
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

  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceDark, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.primary, letterSpacing: -0.2 },

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

  actions: { marginTop: 16 },
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

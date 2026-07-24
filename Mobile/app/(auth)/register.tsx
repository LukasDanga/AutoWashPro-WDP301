import React, { useState, useRef, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../src/contexts/AuthContext';
import { AlertDialog, GoogleLogo, Input, Button, Text } from '../../src/components/common';
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
        <Text variant="h4" weight="700" color="primary" style={s.logoText}>AutoWashPro</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Heading */}
      <View style={s.heading}>
        <Text variant="h2" weight="700" style={s.title}>Tạo tài khoản</Text>
        <Text variant="body" color="textSecondary" style={s.subtitle}>
          Bắt đầu hành trình chăm sóc xế yêu của bạn cùng AutoWashPro.
        </Text>
      </View>

      {/* Form */}
      <View style={s.form}>
        <Input
          ref={nameRef}
          label="Họ và tên"
          placeholder="Vd: Nguyễn Văn A"
          autoCapitalize="words"
          value={formData.name}
          onChangeText={v => updateField('name', v)}
          error={errors.name}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Input
          ref={emailRef}
          label="Email"
          placeholder="example@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={v => updateField('email', v)}
          error={errors.email}
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Input
          ref={phoneRef}
          label="Số điện thoại"
          placeholder="09xx xxx xxx"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={v => updateField('phone', v)}
          error={errors.phone}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Input
          ref={passwordRef}
          label="Mật khẩu"
          placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
          secureTextEntry
          autoCapitalize="none"
          value={formData.password}
          onChangeText={v => updateField('password', v)}
          error={errors.password}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <Button
          title="Đăng ký ngay"
          variant="primary"
          size="large"
          fullWidth
          loading={isLoading}
          onPress={handleRegister}
        />

        <View style={s.dividerWrap}>
          <View style={s.dividerLine} />
          <Text variant="labelSmall" weight="700" color="textTertiary" style={s.dividerText}>HOẶC</Text>
          <View style={s.dividerLine} />
        </View>

        <Button
          title="Tiếp tục với Google"
          variant="outline"
          size="large"
          fullWidth
          loading={isLoading}
          onPress={handleGoogleLogin}
          icon={<GoogleLogo size={22} />}
          style={s.googleBtn}
          textStyle={s.googleBtnText}
        />

        <Text variant="body" align="center" color="textSecondary" style={s.footerNote}>
          Đã có tài khoản?{' '}
          <Link href="/(auth)/login" asChild>
            <Text variant="body" weight="700" color="primary">Đăng nhập</Text>
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
  logoText: { letterSpacing: -0.2 },

  heading: { marginBottom: 32 },
  title: { letterSpacing: -1, marginBottom: 8 },
  subtitle: { lineHeight: 24 },
  
  form: { marginBottom: 8 },
  
  actions: { marginTop: 16 },
  
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 16 },

  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  googleBtnText: {
    color: colors.textPrimary,
  },
  
  footerNote: { marginTop: 32 },
});

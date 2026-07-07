/**
 * AutoWashPro Change Password Screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { authApi } from '../../src/api/auth';
import {
  Button,
  Input,
  Icon,
  Icons,
  ScreenContainer,
  Header,
  Text as AppText,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';

const getStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Rất yếu', color: '#DC2626' },
    { label: 'Yếu', color: '#EA580C' },
    { label: 'Trung bình', color: '#CA8A04' },
    { label: 'Mạnh', color: '#16A34A' },
    { label: 'Rất mạnh', color: '#15803D' },
  ];
  const idx = Math.min(score, levels.length - 1);
  return { level: score, label: levels[idx].label, color: levels[idx].color };
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const { refreshTokens } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authApi.changePassword(formData.currentPassword, formData.newPassword);
      toast.success('Đổi mật khẩu thành công', 'Mật khẩu của bạn đã được cập nhật');
      setTimeout(() => router.back(), 600);
    } catch (error: any) {
      AlertDialog.error(
        'Đổi mật khẩu thất bại',
        error.response?.data?.message || 'Không thể thay đổi mật khẩu. Vui lòng kiểm tra mật khẩu hiện tại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getStrength(formData.newPassword);

  return (
    <ScreenContainer padded={false} keyboardAvoiding>
      <Header title="Đổi mật khẩu" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primarySubtle }]}>
          <Icon name="lock-closed-outline" size={36} color={colors.primary} />
        </View>

        <AppText variant="body" color="textSecondary" align="center" style={styles.description}>
          Để bảo mật tài khoản, vui lòng sử dụng mật khẩu mạnh với ít nhất 6 ký tự
        </AppText>

        <View style={styles.formContainer}>
          <Input
            label="Mật khẩu hiện tại"
            placeholder="Nhập mật khẩu hiện tại"
            value={formData.currentPassword}
            onChangeText={(value) => updateField('currentPassword', value)}
            error={errors.currentPassword}
            secureTextEntry
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Mật khẩu mới"
            placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
            value={formData.newPassword}
            onChangeText={(value) => updateField('newPassword', value)}
            error={errors.newPassword}
            secureTextEntry
            containerStyle={styles.inputContainer}
          />

          {formData.newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={[styles.strengthTrack, { backgroundColor: colors.surfaceDark }]}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      backgroundColor: strength.color,
                      width: `${(strength.level / 4) * 100}%`,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" weight="600" style={{ color: strength.color }}>
                {strength.label}
              </AppText>
            </View>
          )}

          <Input
            label="Xác nhận mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
            containerStyle={styles.inputContainer}
          />

          <Button
            title="Đổi mật khẩu"
            onPress={handleChangePassword}
            loading={isLoading}
            fullWidth
            size="large"
            style={styles.button}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  description: {
    marginBottom: 32,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  button: {
    marginTop: 16,
  },
});
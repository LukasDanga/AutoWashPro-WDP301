/**
 * AutoWashPro Edit Profile Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
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

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
      });
    }
  }, [user]);

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ tên';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Họ tên phải có ít nhất 2 ký tự';
    }

    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      });
      toast.success('Cập nhật thành công', 'Thông tin cá nhân đã được lưu');
      setTimeout(() => router.back(), 600);
    } catch (error: any) {
      AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer padded={false}>
      <Header title="Chỉnh sửa thông tin" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <AppText variant="h1" color="textInverse" weight="700">
                {formData.name?.charAt(0).toUpperCase() || 'U'}
              </AppText>
            </View>
            <View style={[styles.editAvatarButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
              <Icon name="camera-outline" size={16} color={colors.primary} />
            </View>
          </View>
          <AppText variant="caption" color="textTertiary">
            Nhấn để thay đổi ảnh đại diện
          </AppText>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Input
            label="Họ và tên *"
            placeholder="Nhập họ và tên"
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            error={errors.name}
            autoCapitalize="words"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            error={errors.phone}
            keyboardType="phone-pad"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Ngày sinh"
            placeholder="YYYY-MM-DD"
            value={formData.dateOfBirth}
            onChangeText={(value) => updateField('dateOfBirth', value)}
            error={errors.dateOfBirth}
            containerStyle={styles.inputContainer}
          />

          {/* Email (read-only) */}
          <View style={[styles.readOnlyField, { backgroundColor: colors.surface }]}>
            <AppText variant="label" color="textSecondary" style={styles.readOnlyLabel}>
              Email
            </AppText>
            <AppText variant="body" weight="500">
              {user?.email || '-'}
            </AppText>
            <AppText variant="caption" color="textTertiary" style={styles.readOnlyHint}>
              Email không thể thay đổi
            </AppText>
          </View>
        </View>

        <Button
          title="Lưu thay đổi"
          onPress={handleSave}
          loading={isLoading}
          fullWidth
          size="large"
        />

        <View style={styles.bottomPadding} />
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 4,
  },
  readOnlyField: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
  },
  readOnlyLabel: {
    marginBottom: 4,
  },
  readOnlyHint: {
    marginTop: 4,
  },
  bottomPadding: {
    height: 48,
  },
});
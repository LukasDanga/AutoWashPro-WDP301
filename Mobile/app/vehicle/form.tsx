import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { vehicleApi } from '../../src/api';
import {
  Header,
  ScreenContainer,
  Input,
  Button,
  SegmentedControl,
  Text as AppText,
  AlertDialog,
  useToast,
  Loading,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { VehicleType } from '../../src/types';

export default function VehicleFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;
  
  const colors = useColors();
  const toast = useToast();

  const [isLoadingData, setIsLoadingData] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: 'sedan' as VehicleType,
    brand: '',
    model: '',
    color: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && params.id) {
      const fetchVehicle = async () => {
        try {
          const vehicle = await vehicleApi.getVehicle(params.id!);
          setFormData({
            licensePlate: vehicle.licensePlate || '',
            vehicleType: vehicle.vehicleType || 'sedan',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            color: vehicle.color || '',
            isDefault: vehicle.isDefault || false,
          });
        } catch (error: any) {
          AlertDialog.error('Lỗi', 'Không thể tải thông tin phương tiện. ' + (error.response?.data?.message || ''));
          router.back();
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchVehicle();
    }
  }, [isEditing, params.id]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Vui lòng nhập biển số xe';
    }
    if (!formData.brand.trim()) {
      newErrors.brand = 'Vui lòng nhập hãng xe (VD: Honda, Mazda)';
    }
    if (!formData.color.trim()) {
      newErrors.color = 'Vui lòng nhập màu xe';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload = {
        licensePlate: formData.licensePlate.trim(),
        vehicleType: formData.vehicleType,
        brand: formData.brand.trim(),
        model: formData.model.trim() || undefined,
        color: formData.color.trim(),
        isDefault: formData.isDefault,
      };

      if (isEditing && params.id) {
        await vehicleApi.updateVehicle(params.id, payload);
        toast.success('Thành công', 'Đã cập nhật thông tin phương tiện');
      } else {
        await vehicleApi.addVehicle(payload);
        toast.success('Thành công', 'Đã thêm phương tiện mới');
      }
      
      // Delay slightly for toast then go back
      setTimeout(() => router.back(), 500);
    } catch (error: any) {
      AlertDialog.error('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData) {
    return <Loading fullScreen message="Đang tải thông tin..." />;
  }

  return (
    <ScreenContainer edges={['top']} padded={false}>
      <Header
        showBack
        title={isEditing ? 'Cập nhật phương tiện' : 'Thêm phương tiện mới'}
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Biển số xe *"
          placeholder="VD: 51H-123.45"
          value={formData.licensePlate}
          onChangeText={(val) => updateField('licensePlate', val)}
          error={errors.licensePlate}
          autoCapitalize="characters"
          containerStyle={styles.inputSpacing}
        />

        <View style={styles.inputSpacing}>
          <AppText variant="label" color="textSecondary" style={styles.label}>
            Loại xe *
          </AppText>
          <SegmentedControl<VehicleType>
            fullWidth
            options={[
              { label: 'Sedan', value: 'sedan' },
              { label: 'SUV', value: 'suv' },
              { label: 'Bán tải', value: 'pickup' },
              { label: 'Van', value: 'van' },
            ]}
            value={formData.vehicleType}
            onChange={(val) => updateField('vehicleType', val)}
          />
        </View>

        <Input
          label="Hãng xe *"
          placeholder="VD: Mazda, Honda, VinFast"
          value={formData.brand}
          onChangeText={(val) => updateField('brand', val)}
          error={errors.brand}
          containerStyle={styles.inputSpacing}
        />

        <Input
          label="Dòng xe (Tuỳ chọn)"
          placeholder="VD: CX-5, City, VF8"
          value={formData.model}
          onChangeText={(val) => updateField('model', val)}
          error={errors.model}
          containerStyle={styles.inputSpacing}
        />

        <Input
          label="Màu xe *"
          placeholder="VD: Đen, Trắng"
          value={formData.color}
          onChangeText={(val) => updateField('color', val)}
          error={errors.color}
          containerStyle={styles.inputSpacing}
        />

        <View style={[styles.switchContainer, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.switchLabelContainer}>
            <AppText variant="h4">Đặt làm xe mặc định</AppText>
            <AppText variant="caption" color="textTertiary">
              Tự động chọn phương tiện này khi đặt lịch
            </AppText>
          </View>
          <Switch
            value={formData.isDefault}
            onValueChange={(val) => updateField('isDefault', val)}
            trackColor={{ false: '#E2E8F0', true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>

      </ScrollView>

      <View style={[styles.bottomContainer, { borderTopColor: colors.border }]}>
        <Button
          title={isEditing ? 'Lưu thay đổi' : 'Thêm phương tiện'}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          fullWidth
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  inputSpacing: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchLabelContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  bottomContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
});

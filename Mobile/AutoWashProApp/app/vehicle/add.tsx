/**
 * AutoWashPro Add/Edit Vehicle Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehicleApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Button,
  Loading,
  Input,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Vehicle, VehicleType } from '../../src/types';

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'sedan', label: 'Sedan', icon: '🚗' },
  { value: 'suv', label: 'SUV', icon: '🚙' },
  { value: 'pickup', label: 'Pickup', icon: '🛻' },
  { value: 'van', label: 'Van', icon: '🚐' },
  { value: 'motorcycle', label: 'Xe máy', icon: '🏍️' },
];

export default function VehicleFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: 'sedan' as VehicleType,
    brand: '',
    model: '',
    color: '',
    year: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && params.id) {
      fetchVehicle(params.id);
    }
  }, [params.id]);

  const fetchVehicle = async (id: string) => {
    try {
      const vehicle = await vehicleApi.getVehicle(id);
      setFormData({
        licensePlate: vehicle.licensePlate,
        vehicleType: vehicle.vehicleType,
        brand: vehicle.brand,
        model: vehicle.model || '',
        color: vehicle.color,
        year: vehicle.year?.toString() || '',
        isDefault: vehicle.isDefault,
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin phương tiện');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Vui lòng nhập biển số';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Vui lòng nhập hãng xe';
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
      const data = {
        licensePlate: formData.licensePlate.toUpperCase(),
        vehicleType: formData.vehicleType,
        brand: formData.brand.trim(),
        model: formData.model.trim() || undefined,
        color: formData.color.trim(),
        year: formData.year ? parseInt(formData.year) : undefined,
        isDefault: formData.isDefault,
      };

      if (isEditing && params.id) {
        await vehicleApi.updateVehicle(params.id, data);
        Alert.alert('Thành công', 'Đã cập nhật phương tiện');
      } else {
        await vehicleApi.addVehicle(data);
        Alert.alert('Thành công', 'Đã thêm phương tiện mới');
      }

      router.back();
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể lưu phương tiện'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">
          {isEditing ? 'Sửa phương tiện' : 'Thêm phương tiện'}
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Input
          label="Biển số xe *"
          placeholder="VD: 30A-12345"
          value={formData.licensePlate}
          onChangeText={(value) => updateField('licensePlate', value.toUpperCase())}
          error={errors.licensePlate}
          autoCapitalize="characters"
          containerStyle={styles.inputContainer}
        />

        <AppText variant="label" style={styles.sectionLabel}>
          Loại xe *
        </AppText>
        <View style={styles.typeGrid}>
          {VEHICLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeCard,
                formData.vehicleType === type.value && styles.typeCardSelected,
              ]}
              onPress={() => updateField('vehicleType', type.value)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={[
                styles.typeLabel,
                formData.vehicleType === type.value && styles.typeLabelSelected,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Hãng xe *"
          placeholder="VD: Toyota, Honda"
          value={formData.brand}
          onChangeText={(value) => updateField('brand', value)}
          error={errors.brand}
          autoCapitalize="words"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Dòng xe"
          placeholder="VD: Camry, Civic"
          value={formData.model}
          onChangeText={(value) => updateField('model', value)}
          autoCapitalize="words"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Màu xe *"
          placeholder="VD: Đen, Trắng, Bạc"
          value={formData.color}
          onChangeText={(value) => updateField('color', value)}
          error={errors.color}
          autoCapitalize="words"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Năm sản xuất"
          placeholder="VD: 2023"
          value={formData.year}
          onChangeText={(value) => updateField('year', value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={4}
          containerStyle={styles.inputContainer}
        />

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => updateField('isDefault', !formData.isDefault)}
          >
            <View style={[
              styles.checkboxBox,
              formData.isDefault && styles.checkboxBoxChecked,
            ]}>
              {formData.isDefault && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <AppText variant="body">Đặt làm phương tiện mặc định</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.bottomAction}>
        <Button
          title={isEditing ? 'Cập nhật' : 'Thêm mới'}
          onPress={handleSave}
          loading={isSaving}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  typeIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  typeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    marginTop: spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  bottomPadding: {
    height: spacing.xxl,
  },
  bottomAction: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});

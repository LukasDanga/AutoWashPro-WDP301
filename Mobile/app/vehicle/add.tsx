/**
 * AutoWashPro Add/Edit Vehicle Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { vehicleApi } from '../../src/api';
import {
  Text as AppText,
  Button,
  Loading,
  Input,
  Icon,
  Icons,
  ScreenContainer,
  Header,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';
import type { VehicleType } from '../../src/types';

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'sedan', label: 'Sedan', icon: 'car-outline' },
  { value: 'suv', label: 'SUV', icon: 'car-sport-outline' },
  { value: 'pickup', label: 'Pickup', icon: 'car-outline' },
  { value: 'van', label: 'Van', icon: 'bus-outline' },
];

export default function VehicleFormScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;
  const toast = useToast();
  const insets = useSafeAreaInsets();

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
      AlertDialog.error('Lỗi', 'Không thể tải thông tin phương tiện');
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
        toast.success('Cập nhật thành công', 'Thông tin phương tiện đã được cập nhật');
      } else {
        await vehicleApi.addVehicle(data);
        toast.success('Thêm thành công', 'Phương tiện mới đã được thêm vào');
      }

      router.back();
    } catch (error: any) {
      AlertDialog.error(
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
    <ScreenContainer padded={false}>
      <Header title={isEditing ? 'Sửa phương tiện' : 'Thêm phương tiện'} showBack />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <Input
          label="Biển số xe *"
          placeholder="VD: 30A-12345"
          value={formData.licensePlate}
          onChangeText={(value) => updateField('licensePlate', value.toUpperCase())}
          error={errors.licensePlate}
          autoCapitalize="characters"
          containerStyle={styles.inputContainer}
        />

        <AppText variant="label" weight="600" style={styles.sectionLabel}>
          Loại xe *
        </AppText>
        <View style={styles.typeGrid}>
          {VEHICLE_TYPES.map((type) => {
            const selected = formData.vehicleType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: selected ? colors.primarySubtle : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => updateField('vehicleType', type.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Loại xe ${type.label}`}
              >
                <Icon
                  name={type.icon}
                  size={26}
                  color={selected ? colors.primary : colors.textSecondary}
                />
                <AppText
                  variant="caption"
                  weight={selected ? '600' : '500'}
                  color={selected ? 'primary' : 'textSecondary'}
                  style={styles.typeLabel}
                >
                  {type.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
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

        <View style={styles.defaultRow}>
          <View style={styles.defaultInfo}>
            <AppText variant="body" weight="500">
              Đặt làm phương tiện mặc định
            </AppText>
            <AppText variant="caption" color="textSecondary">
              Sẽ được chọn tự động khi đặt lịch
            </AppText>
          </View>
          <Switch
            value={formData.isDefault}
            onValueChange={(value) => updateField('isDefault', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
            accessibilityLabel="Đặt làm phương tiện mặc định"
          />
        </View>
      </KeyboardAwareScrollView>

      <View style={[styles.bottomAction, { borderTopColor: colors.border, backgroundColor: colors.surfaceElevated, paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 16 }]}>
        <Button
          title={isEditing ? 'Cập nhật' : 'Thêm mới'}
          onPress={handleSave}
          loading={isSaving}
          fullWidth
          size="large"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputContainer: {
    marginBottom: 4,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  typeLabel: {
    textAlign: 'center',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  defaultInfo: {
    flex: 1,
  },
  bottomAction: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
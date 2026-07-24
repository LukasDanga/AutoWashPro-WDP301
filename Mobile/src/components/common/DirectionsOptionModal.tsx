import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, shadows, spacing } from '../../theme/spacing';
import type { Branch } from '../../types';

interface DirectionsOptionModalProps {
  visible: boolean;
  branch: Branch | null;
  onClose: () => void;
  onSelectInApp: (branch: Branch) => void;
}

export const DirectionsOptionModal: React.FC<DirectionsOptionModalProps> = ({
  visible,
  branch,
  onClose,
  onSelectInApp,
}) => {
  if (!branch) return null;

  const handleOpenGoogleMaps = () => {
    onClose();
    const query = encodeURIComponent(`${branch.name}, ${branch.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleSelectInApp = () => {
    onClose();
    onSelectInApp(branch);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={s.sheetContainer}>
          {/* Handle Indicator */}
          <View style={s.handleIndicator} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Chọn phương thức chỉ đường</Text>
            <Text style={s.subtitle} numberOfLines={1}>
              Đến {branch.name}
            </Text>
          </View>

          {/* Options */}
          <View style={s.optionsWrap}>
            {/* Option 1: In-App Directions */}
            <TouchableOpacity
              style={s.optionCard}
              onPress={handleSelectInApp}
              activeOpacity={0.75}
            >
              <View style={[s.iconBox, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="navigate-circle" size={28} color={colors.primary} />
              </View>
              <View style={s.optionTextWrap}>
                <Text style={s.optionTitle}>Chỉ đường trong ứng dụng</Text>
                <Text style={s.optionSubtitle}>
                  Xem khoảng cách, thời gian & lộ trình từng ngã rẽ trực tiếp
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Option 2: Google Maps External */}
            <TouchableOpacity
              style={s.optionCard}
              onPress={handleOpenGoogleMaps}
              activeOpacity={0.75}
            >
              <View style={[s.iconBox, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="map" size={26} color={colors.error} />
              </View>
              <View style={s.optionTextWrap}>
                <Text style={s.optionTitle}>Mở ứng dụng Google Maps</Text>
                <Text style={s.optionSubtitle}>
                  Dẫn đường giọng nói Turn-by-Turn chuẩn xác từ Google
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.cancelBtnText}>Hủy bỏ</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...shadows.lg,
  },
  handleIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  optionsWrap: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});

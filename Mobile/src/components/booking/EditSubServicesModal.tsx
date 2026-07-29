import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text } from '../common/Text';
import { Button } from '../common/Button';
import { Icon, Icons } from '../common/Icon';
import { useColors } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatCurrency } from '../../utils';

export interface SubServiceOption {
  name: string;
  price: number;
  duration: number;
  isOptional?: boolean;
}

interface EditSubServicesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (selectedNames: string[]) => void;
  availableSubServices: SubServiceOption[];
  initialSelected: string[];
  loading?: boolean;
}

export const EditSubServicesModal: React.FC<EditSubServicesModalProps> = ({
  visible,
  onClose,
  onSave,
  availableSubServices,
  initialSelected,
  loading = false,
}) => {
  const colors = useColors();
  const [selected, setSelected] = useState<string[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setSelected(initialSelected);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialSelected]);

  const toggleSubService = (name: string) => {
    setSelected(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const handleSave = () => {
    onSave(selected);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} disabled={loading} />
        
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text variant="h3" style={{ fontWeight: '600' }}>Chỉnh sửa dịch vụ</Text>
            <TouchableOpacity onPress={onClose} disabled={loading} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Icon name={Icons.close} size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text variant="bodySmall" color="textSecondary" style={styles.helpText}>
              Chọn hoặc bỏ chọn các dịch vụ phụ trợ. Việc bỏ chọn dịch vụ đã thanh toán sẽ tự động hoàn lại tiền thừa vào Ví của bạn.
            </Text>

            {availableSubServices.length === 0 ? (
              <Text variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginTop: 20 }}>
                Gói này không có dịch vụ phụ.
              </Text>
            ) : (
              availableSubServices.map((sub, idx) => {
                const isSelected = selected.includes(sub.name);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.itemRow,
                      { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primarySubtle : colors.surface }
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleSubService(sub.name)}
                    disabled={loading}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[
                        styles.checkbox,
                        { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent' }
                      ]}>
                        {isSelected && <Icon name={Icons.checkmark} size={14} color="#FFF" />}
                      </View>
                      <View style={styles.itemTextWrap}>
                        <Text variant="body" style={{ fontWeight: '600', color: isSelected ? colors.primary : colors.textPrimary }}>
                          {sub.name}
                        </Text>
                        <Text variant="caption" color="textSecondary">
                          ⏱ {sub.duration} phút
                        </Text>
                      </View>
                    </View>
                    <Text variant="body" style={{ fontWeight: '700', color: isSelected ? colors.primary : colors.textPrimary }}>
                      {sub.price > 0 ? `+${formatCurrency(sub.price)}` : 'Miễn phí'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              title="Lưu thay đổi"
              onPress={handleSave}
              loading={loading}
              fullWidth
            />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  helpText: {
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  }
});

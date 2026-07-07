/**
 * AutoWashPro Language Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {
  Text as AppText,
  Card,
  ScreenContainer,
  Header,
  ListItem,
  Icon,
  Icons,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: 'VN' },
  { code: 'en', name: 'English', nativeName: 'English', flag: 'EN' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: 'CN' },
];

export default function LanguageScreen() {
  const colors = useColors();
  const toast = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState('vi');

  const handleSelect = (code: string) => {
    if (code === selectedLanguage) return;

    setSelectedLanguage(code);

    if (code === 'en') {
      AlertDialog.info(
        'Ngôn ngữ',
        'English language support is coming soon!',
      );
    } else if (code === 'zh') {
      AlertDialog.info(
        'Ngôn ngữ',
        'Hỗ trợ tiếng Trung sắp ra mắt!',
      );
    } else {
      toast.success('Đã đổi ngôn ngữ', 'Ngôn ngữ hiển thị đã được cập nhật sang Tiếng Việt');
    }
  };

  return (
    <ScreenContainer scroll>
      <Header showBack title="Ngôn ngữ" />

      {/* Info Card */}
      <View style={styles.infoWrapper}>
        <Card style={[styles.infoCard, { backgroundColor: colors.primarySubtle }]}>
          <Icon name={Icons.globeOutline} size={32} color={colors.primary} />
          <View style={styles.infoContent}>
            <AppText variant="body" style={styles.infoTitle}>
              Chọn ngôn ngữ
            </AppText>
            <AppText variant="bodySmall" color="textSecondary">
              Thay đổi ngôn ngữ hiển thị trong ứng dụng
            </AppText>
          </View>
        </Card>
      </View>

      {/* Language List */}
      <View style={styles.section}>
        <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
          Ngôn ngữ có sẵn
        </AppText>
        <Card padding={0}>
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.code}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <ListItem
                leading={
                  <View style={[styles.flagContainer, { backgroundColor: colors.surface }]}>
                    <AppText variant="bodySmall" style={{ fontWeight: '600' }}>{lang.flag}</AppText>
                  </View>
                }
                title={lang.nativeName}
                subtitle={lang.name}
                trailing={
                  selectedLanguage === lang.code ? (
                    <Icon name={Icons.checkmark} size={20} color={colors.primary} />
                  ) : null
                }
                onPress={() => handleSelect(lang.code)}
                showDivider={false}
              />
            </React.Fragment>
          ))}
        </Card>
      </View>

      {/* Note */}
      <View style={styles.section}>
        <Card style={[styles.noteCard, { backgroundColor: colors.warningLight }]}>
          <Icon name={Icons.bulbOutline} size={24} color={colors.warning} />
          <View style={styles.noteContent}>
            <AppText variant="bodySmall" style={[styles.noteTitle, { color: colors.warning }]}>
              Lưu ý
            </AppText>
            <AppText variant="caption" color="textSecondary">
              Hiện tại ứng dụng chỉ hỗ trợ Tiếng Việt. Các ngôn ngữ khác đang được phát triển và sẽ sớm có sẵn.
            </AppText>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  infoWrapper: {
    paddingHorizontal: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  flagContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});

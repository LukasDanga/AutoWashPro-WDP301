/**
 * AutoWashPro Language Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text as AppText, 
  Card,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('vi');

  const handleSelect = (code: string) => {
    if (code === selectedLanguage) return;
    
    setSelectedLanguage(code);
    
    if (code === 'en') {
      Alert.alert(
        'Ngôn ngữ',
        'English language support is coming soon!',
        [{ text: 'OK' }]
      );
    } else if (code === 'zh') {
      Alert.alert(
        'Ngôn ngữ',
        'Hỗ trợ tiếng Trung sắp ra mắt!',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Thành công', 'Đã đổi ngôn ngữ sang Tiếng Việt');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Ngôn ngữ</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>🌐</Text>
          <View style={styles.infoContent}>
            <AppText variant="body" style={styles.infoTitle}>
              Chọn ngôn ngữ
            </AppText>
            <AppText variant="bodySmall" color="textSecondary">
              Thay đổi ngôn ngữ hiển thị trong ứng dụng
            </AppText>
          </View>
        </Card>

        {/* Language List */}
        <View style={styles.section}>
          <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
            Ngôn ngữ có sẵn
          </AppText>
          <Card padding={0}>
            {LANGUAGES.map((lang, index) => (
              <React.Fragment key={lang.code}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.languageRow}
                  onPress={() => handleSelect(lang.code)}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.languageInfo}>
                    <AppText variant="body">{lang.nativeName}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {lang.name}
                    </AppText>
                  </View>
                  {selectedLanguage === lang.code && (
                    <View style={styles.checkContainer}>
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* Note */}
        <Card style={styles.noteCard}>
          <Text style={styles.noteIcon}>💡</Text>
          <View style={styles.noteContent}>
            <AppText variant="bodySmall" style={styles.noteTitle}>
              Lưu ý
            </AppText>
            <AppText variant="caption" color="textSecondary">
              Hiện tại ứng dụng chỉ hỗ trợ Tiếng Việt. Các ngôn ngữ khác đang được phát triển và sẽ sớm có sẵn.
            </AppText>
          </View>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    backgroundColor: colors.primaryLight,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  section: {
    padding: spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 72,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  flag: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  languageInfo: {
    flex: 1,
  },
  checkContainer: {
    marginLeft: spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
  noteCard: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.warningLight,
  },
  noteIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.warning,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

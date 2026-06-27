/**
 * AutoWashPro Branch List Screen
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Loading } from '../../src/components/common';
import { branchApi } from '../../src/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Branch } from '../../src/types';

export default function BranchScreen() {
  const router = useRouter();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    branchApi.getPublicBranches()
      .then(setBranches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading fullScreen message="Đang tải..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi nhánh</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={branches}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/branch/${item._id}`)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Text style={styles.emoji}>📍</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
                  <Text style={styles.hours}>{item.openingTime} - {item.closingTime}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, backgroundColor: colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { fontSize: 24, color: colors.primary },
  headerTitle: { ...typography.h4, color: colors.textPrimary },
  list: { padding: spacing.md },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  emoji: { fontSize: 24 },
  info: { flex: 1 },
  name: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  address: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  hours: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  arrow: { fontSize: 24, color: colors.textTertiary },
});

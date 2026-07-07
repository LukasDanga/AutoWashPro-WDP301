/**
 * AutoWashPro Branch List Screen
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Loading, Icon, Header, ScreenContainer, Text as AppText } from '../../src/components/common';
import { branchApi } from '../../src/api';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import type { Branch } from '../../src/types';

export default function BranchScreen() {
  const router = useRouter();
  const colors = useColors();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    branchApi.getPublicBranches()
      .then(setBranches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading fullScreen message="Đang tải..." />;

  const renderBranchCard = ({ item }: { item: Branch }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/branch/${item._id}`)}
      accessibilityLabel={`Chi nhánh ${item.name}, ${item.address}`}
      accessibilityRole="button"
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Icon name="location-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <AppText variant="body" weight="600" color="textPrimary">
              {item.name}
            </AppText>
            <AppText 
              variant="caption" 
              color="textSecondary" 
              style={styles.addressText}
              numberOfLines={1}
            >
              {item.address}
            </AppText>
            <AppText variant="caption" color="textTertiary" style={styles.hoursText}>
              {item.openingTime} - {item.closingTime}
            </AppText>
          </View>
          <Icon name="chevron-forward" size={24} color={colors.textTertiary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['top']}>
      <Header showBack title="Chi nhánh" />

      <FlatList
        data={branches}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={renderBranchCard}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20 },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 50, 
    height: 50, 
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  addressText: { marginTop: 2 },
  hoursText: { marginTop: 2 },
});

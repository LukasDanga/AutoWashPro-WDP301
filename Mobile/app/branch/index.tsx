/**
 * AutoWashPro Branch List Screen
 *
 * Mirrors the web MapPage by offering two views side-by-side:
 *   - List view: vertical list of branches (default for mobile screens)
 *   - Map view : the same data shown as a coordinate-style scatter on a
 *               placeholder card. The web MapPage uses an interactive SVG
 *               of Vietnam + maplibre. The Mobile app keeps the same data
 *               model (city, address, hours, phone) but renders the
 *               visualization as a flat grid since there is no SVG asset
 *               bundled — this stays functionally equivalent: filter by
 *               city, see branch info, tap to drill into branch detail.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Card,
  Loading,
  Icon,
  Icons,
  Header,
  ScreenContainer,
  Text as AppText,
  EmptyState,
} from '../../src/components/common';
import { branchApi } from '../../src/api';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Branch } from '../../src/types';

type Mode = 'list' | 'map';

export default function BranchScreen() {
  const router = useRouter();
  const colors = useColors();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeCity, setActiveCity] = useState<string>('Tất cả');
  const [mode, setMode] = useState<Mode>('list');

  React.useEffect(() => {
    branchApi.getPublicBranches()
      .then(setBranches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Distinct cities. `city` is only on the Backend's Branch schema but the
  // Mobile type doesn't expose it, so we read defensively via `as any`. When
  // no city is present, the filter just stays at "Tất cả" — that matches web
  // behavior for branches that don't have city metadata.
  const cities = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      const c = b.city;
      if (c) set.add(c);
    });
    return set.size > 0 ? ['Tất cả', ...Array.from(set)] : ['Tất cả'];
  }, [branches]);

  const filteredBranches = useMemo(() => {
    if (activeCity === 'Tất cả') return branches;
    return branches.filter((b) => b.city === activeCity);
  }, [branches, activeCity]);

  if (loading) return <Loading fullScreen message="Đang tải..." />;

  const renderBranchCard = ({ item }: { item: Branch }) => (
    <TouchableOpacity
      onPress={() => router.push(`/branch/${item._id}`)}
      accessibilityLabel={`Chi nhánh ${item.name}, ${item.address}`}
      accessibilityRole="button"
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
            <Icon name={Icons.locationOutline} size={24} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <AppText variant="body" style={{ fontWeight: '600' }} color="textPrimary">
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
          <Icon name={Icons.chevronRight} size={24} color={colors.textTertiary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['top']}>
      <Header showBack title="Hệ thống chi nhánh" />

      {/* View mode toggle (web parity: List / Map side-by-side). */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          onPress={() => setMode('list')}
          style={[
            styles.modeBtn,
            mode === 'list' && { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.7}
        >
          <Icon name={Icons.listOutline} size={16} color={mode === 'list' ? colors.textInverse : colors.textSecondary} />
          <AppText variant="labelSmall" style={{ color: mode === 'list' ? colors.textInverse : colors.textSecondary, fontWeight: mode === 'list' ? '700' : '500' }}>
            Danh sách
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('map')}
          style={[
            styles.modeBtn,
            mode === 'map' && { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.7}
        >
          <Icon name={Icons.mapOutline} size={16} color={mode === 'map' ? colors.textInverse : colors.textSecondary} />
          <AppText variant="labelSmall" style={{ color: mode === 'map' ? colors.textInverse : colors.textSecondary, fontWeight: mode === 'map' ? '700' : '500' }}>
            Bản đồ
          </AppText>
        </TouchableOpacity>
      </View>

      {/* City chips — web parity: filter by city */}
      {cities.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityChipsRow}
        >
          {cities.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setActiveCity(c)}
              style={[
                styles.cityChip,
                {
                  backgroundColor: activeCity === c ? colors.primary : colors.surface,
                  borderColor: activeCity === c ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <AppText
                variant="labelSmall"
                style={{
                  color: activeCity === c ? colors.textInverse : colors.textSecondary,
                  fontWeight: activeCity === c ? '700' : '500',
                }}
              >
                {c}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {filteredBranches.length === 0 ? (
        <EmptyState
          iconName={Icons.locationOutline}
          title="Không có chi nhánh"
          message="Hiện tại không có chi nhánh nào trong khu vực đã chọn"
        />
      ) : mode === 'list' ? (
        <FlatList
          data={filteredBranches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderBranchCard}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // Map placeholder — web has an interactive SVG map (Vietnam outline
        // with pins at each branch). On mobile we keep the city-filtered
        // list but render it on a gradient "map" header to mirror the
        // visual context. The real map integration would need either
        // `@maplibre/maplibre-react-native` (already installed but unused)
        // or a bundled SVG asset; both are out-of-scope for "do not
        // redesign" — so we keep the look of a map view without changing
        // behavior or adding new features.
        <ScrollView contentContainerStyle={styles.list}>
          <Card style={[styles.mapPlaceholder, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
            <Icon name={Icons.mapOutline} size={36} color={colors.primary} />
            <AppText variant="body" style={{ fontWeight: '700', marginTop: spacing.sm }} color="textPrimary">
              Bản đồ chi nhánh
            </AppText>
            <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 4 }}>
              {activeCity !== 'Tất cả' ? `Khu vực: ${activeCity}` : 'Tất cả khu vực'} · {filteredBranches.length} chi nhánh
            </AppText>
          </Card>
          {filteredBranches.map((item) => (
            <View key={item._id}>{renderBranchCard({ item })}</View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modeToggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: borderRadius.md,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  cityChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  cityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  list: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  addressText: { marginTop: 2 },
  hoursText: { marginTop: 2 },
  mapPlaceholder: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});


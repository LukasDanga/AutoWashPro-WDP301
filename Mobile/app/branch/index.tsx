import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Linking,
} from 'react-native';
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
import { VietnamMapComponent } from '../../src/components/common/VietnamMapComponent';
import { InAppDirectionsModal } from '../../src/components/common/InAppDirectionsModal';
import { DirectionsOptionModal } from '../../src/components/common/DirectionsOptionModal';
import { branchApi } from '../../src/api';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Branch } from '../../src/types';

type Mode = 'list' | 'map';

export default function BranchScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = createStyles(colors);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState<string>('Tất cả');
  const [mode, setMode] = useState<Mode>('list');
  const [selectedMapBranchId, setSelectedMapBranchId] = useState<string | null>(null);
  const [optionBranch, setOptionBranch] = useState<Branch | null>(null);
  const [inAppBranch, setInAppBranch] = useState<Branch | null>(null);

  React.useEffect(() => {
    branchApi.getPublicBranches()
      .then((data) => {
        setBranches(data);
        if (data.length > 0) setSelectedMapBranchId(data[0]._id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const handleDirections = (branch: Branch) => {
    setOptionBranch(branch);
  };

  const handleBookNow = (branchId: string) => {
    router.push({
      pathname: '/booking' as any,
      params: { branchId },
    });
  };

  if (loading) return <Loading fullScreen message="Đang tải danh sách chi nhánh..." />;

  const renderBranchCard = ({ item }: { item: Branch }) => {
    const open = isOpenNow(item);
    return (
      <Card style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/branch/${item._id}`)}
          style={styles.cardHeader}
        >
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.storefrontOutline} size={24} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <AppText variant="h4" color="textPrimary" numberOfLines={1} style={styles.branchName}>
                  {item.name}
                </AppText>
                <View style={[styles.statusBadge, { backgroundColor: open ? colors.successLight : colors.errorLight }]}>
                  <View style={[styles.statusDot, { backgroundColor: open ? colors.success : colors.error }]} />
                  <AppText variant="caption" style={{ color: open ? colors.success : colors.error, fontWeight: '700', fontSize: 11 }}>
                    {open ? 'Mở cửa' : 'Đóng cửa'}
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" color="textSecondary" style={styles.addressText} numberOfLines={2}>
                {item.address}
              </AppText>
              <View style={styles.hoursRow}>
                <Icon name={Icons.timeOutline} size={14} color={colors.textTertiary} />
                <AppText variant="caption" color="textTertiary">
                  {item.openingTime || '06:00'} - {item.closingTime || '22:00'}
                </AppText>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleDirections(item)}
            activeOpacity={0.7}
          >
            <Icon name={Icons.mapOutline} size={16} color={colors.primary} />
            <AppText variant="labelSmall" style={{ color: colors.primary, fontWeight: '600' }}>
              Chỉ đường
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSolid]}
            onPress={() => handleBookNow(item._id)}
            activeOpacity={0.8}
          >
            <Icon name={Icons.add} size={16} color="#FFFFFF" />
            <AppText variant="labelSmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>
              Đặt lịch ngay
            </AppText>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const selectedBranchForMap = filteredBranches.find((b) => b._id === selectedMapBranchId) || filteredBranches[0];

  return (
    <ScreenContainer edges={['top']} background="subtle">
      <Header showBack title="Hệ thống chi nhánh" />

      {/* Mode Toggle (List / Map) */}
      <View style={styles.modeToggleWrap}>
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            onPress={() => setMode('list')}
            style={[styles.modeBtn, mode === 'list' && styles.modeBtnActive]}
            activeOpacity={0.7}
          >
            <Icon name={Icons.listOutline} size={16} color={mode === 'list' ? colors.primary : colors.textSecondary} />
            <AppText variant="labelSmall" style={{ color: mode === 'list' ? colors.primary : colors.textSecondary, fontWeight: mode === 'list' ? '700' : '500' }}>
              Danh sách ({filteredBranches.length})
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('map')}
            style={[styles.modeBtn, mode === 'map' && styles.modeBtnActive]}
            activeOpacity={0.7}
          >
            <Icon name={Icons.mapOutline} size={16} color={mode === 'map' ? colors.primary : colors.textSecondary} />
            <AppText variant="labelSmall" style={{ color: mode === 'map' ? colors.primary : colors.textSecondary, fontWeight: mode === 'map' ? '700' : '500' }}>
              Bản đồ Việt Nam
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* City Chips */}
      {cities.length > 1 && (
        <View style={styles.cityChipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityChipsRow}
          >
            {cities.map((c) => {
              const isActive = activeCity === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setActiveCity(c)}
                  style={[
                    styles.cityChip,
                    isActive ? styles.cityChipActive : styles.cityChipInactive,
                  ]}
                  activeOpacity={0.7}
                >
                  <AppText
                    variant="labelSmall"
                    style={{
                      color: isActive ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    }}
                  >
                    {c}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {filteredBranches.length === 0 ? (
        <EmptyState
          iconName={Icons.locationOutline}
          title="Không tìm thấy chi nhánh"
          message="Hiện tại chưa có chi nhánh tại khu vực này."
        />
      ) : mode === 'list' ? (
        <FlatList
          data={filteredBranches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderBranchCard}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        /* Full Interactive SVG Vietnam Map Mode */
        <ScrollView contentContainerStyle={styles.mapContainer} showsVerticalScrollIndicator={false}>
          <VietnamMapComponent
            branches={filteredBranches}
            selectedBranchId={selectedMapBranchId}
            onSelectBranch={(b) => setSelectedMapBranchId(b._id)}
            activeCity={activeCity}
          />

          {/* Selected Branch Details Card below Map */}
          {selectedBranchForMap && (
            <Card style={styles.selectedMapCard}>
              <View style={styles.selectedMapHeader}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
                  <Icon name={Icons.storefrontOutline} size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="h4" color="textPrimary" style={{ fontFamily: 'Outfit_700Bold', flex: 1 }}>
                      {selectedBranchForMap.name}
                    </AppText>
                    {selectedBranchForMap.city && (
                      <View style={[styles.cityTag, { backgroundColor: colors.primarySubtle }]}>
                        <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
                          {selectedBranchForMap.city}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="caption" color="textSecondary" style={{ marginTop: 4, lineHeight: 18 }}>
                    {selectedBranchForMap.address}
                  </AppText>
                </View>
              </View>

              <View style={styles.selectedMapActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnOutline, { flex: 1 }]}
                  onPress={() => handleDirections(selectedBranchForMap)}
                  activeOpacity={0.7}
                >
                  <Icon name={Icons.mapOutline} size={18} color={colors.primary} />
                  <AppText variant="labelSmall" style={{ color: colors.primary, fontWeight: '700' }}>
                    Chỉ đường Maps
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSolid, { flex: 1 }]}
                  onPress={() => handleBookNow(selectedBranchForMap._id)}
                  activeOpacity={0.8}
                >
                  <Icon name={Icons.add} size={18} color="#FFFFFF" />
                  <AppText variant="labelSmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Đặt lịch ngay
                  </AppText>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </ScrollView>
      )}

      {/* Directions Option Selection Modal (Google Maps vs In-App) */}
      <DirectionsOptionModal
        visible={!!optionBranch}
        branch={optionBranch}
        onClose={() => setOptionBranch(null)}
        onSelectInApp={(b) => setInAppBranch(b)}
      />

      {/* In-App Directions Navigation Modal */}
      <InAppDirectionsModal
        visible={!!inAppBranch}
        branch={inAppBranch}
        onClose={() => setInAppBranch(null)}
      />
    </ScreenContainer>
  );
}

function isOpenNow(branch: Branch): boolean {
  if (!branch.openingTime || !branch.closingTime) return true;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = branch.openingTime.split(':').map(Number);
  const [closeH, closeM] = branch.closingTime.split(':').map(Number);
  const open = openH * 60 + openM;
  const close = closeH * 60 + closeM;
  return currentTime >= open && currentTime <= close;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    modeToggleWrap: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xs,
    },
    modeToggleRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceDark,
      borderRadius: borderRadius.lg,
      padding: 4,
      gap: 4,
    },
    modeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
    },
    modeBtnActive: {
      backgroundColor: '#FFFFFF',
      ...shadows.sm,
    },

    cityChipsWrap: {
      height: 52,
      justifyContent: 'center',
      marginVertical: 4,
    },
    cityChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.screenPadding,
      gap: 10,
    },
    cityChip: {
      paddingHorizontal: 16,
      height: 38,
      borderRadius: borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    cityChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      ...shadows.sm,
    },
    cityChipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },

    listContainer: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.xs,
    },
    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    cardHeader: {
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    info: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    branchName: {
      fontFamily: 'Outfit_700Bold',
      fontSize: 16,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      gap: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    addressText: {
      lineHeight: 18,
      marginBottom: 6,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: spacing.sm,
    },
    actionBtn: {
      flex: 1,
      height: 42,
      borderRadius: borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionBtnOutline: {
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    actionBtnSolid: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 3,
    },

    // Map view
    mapContainer: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.xs,
    },
    selectedMapCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    selectedMapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    selectedMapActions: {
      flexDirection: 'row',
      gap: 10,
    },
    cityTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      marginLeft: 6,
    },
  });

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { borderRadius, shadows, spacing } from '../../theme/spacing';
import type { Branch } from '../../types';

interface InAppDirectionsModalProps {
  visible: boolean;
  branch: Branch | null;
  onClose: () => void;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface RouteData {
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
}

// Fallback lat/lng coordinates if backend location coordinates are missing
function getBranchLatLng(branch: Branch): { lat: number; lng: number } {
  if (branch.location?.coordinates && branch.location.coordinates.length === 2) {
    return {
      lng: branch.location.coordinates[0],
      lat: branch.location.coordinates[1],
    };
  }

  const name = (branch.name || '').toLowerCase();
  const address = (branch.address || '').toLowerCase();

  if (name.includes('hải châu') || address.includes('đà nẵng')) return { lat: 16.0601, lng: 108.2154 };
  if (name.includes('cầu giấy') || address.includes('hà nội')) return { lat: 21.0362, lng: 105.7905 };
  if (name.includes('thủ đức')) return { lat: 10.8505, lng: 106.7719 };
  if (name.includes('bình thạnh')) return { lat: 10.8012, lng: 106.7112 };
  if (name.includes('gò vấp')) return { lat: 10.8383, lng: 106.6661 };
  if (name.includes('tân phú')) return { lat: 10.7900, lng: 106.6280 };
  if (name.includes('quận 1') || name.includes('q.1')) return { lat: 10.7769, lng: 106.7009 };
  
  // Default Tân Bình
  return { lat: 10.7938, lng: 106.6508 };
}

function fmtDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}ph`;
  return `${m} phút`;
}

function parseManeuver(modifier?: string, name?: string): string {
  let action = 'Đi thẳng';
  if (modifier === 'slight left') action = 'Rẽ trái nhẹ';
  else if (modifier === 'slight right') action = 'Rẽ phải nhẹ';
  else if (modifier === 'left') action = 'Rẽ trái';
  else if (modifier === 'right') action = 'Rẽ phải';
  else if (modifier === 'uturn') action = 'Quay đầu';

  if (name) return `${action} vào ${name}`;
  return action;
}

export const InAppDirectionsModal: React.FC<InAppDirectionsModalProps> = ({
  visible,
  branch,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  useEffect(() => {
    if (visible && branch) {
      fetchDirections();
    }
  }, [visible, branch]);

  const fetchDirections = async () => {
    if (!branch) return;
    setLoading(true);
    setErrorMsg(null);
    setRouteData(null);

    try {
      // 1. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userLat = 10.7769; // fallback TP.HCM center if denied
      let userLng = 106.7009;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        userLat = loc.coords.latitude;
        userLng = loc.coords.longitude;
      }

      const dest = getBranchLatLng(branch);

      // 2. Fetch OSRM driving route API
      const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${dest.lng},${dest.lat}?overview=false&steps=true`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.routes && json.routes.length > 0) {
        const r = json.routes[0];
        const rawSteps = r.legs[0]?.steps || [];
        const parsedSteps: RouteStep[] = rawSteps.map((s: any) => ({
          instruction: parseManeuver(s.maneuver?.modifier, s.name),
          distance: s.distance,
          duration: s.duration,
        }));

        setRouteData({
          distance: r.distance,
          duration: r.duration,
          steps: parsedSteps,
        });
      } else {
        setErrorMsg('Không thể tính toán tuyến đường. Vui lòng mở Google Maps.');
      }
    } catch (err) {
      console.log('Directions error:', err);
      setErrorMsg('Không thể kết nối dịch vụ bản đồ. Bạn có thể mở Google Maps bên dưới.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExternalMaps = () => {
    if (!branch) return;
    const query = encodeURIComponent(`${branch.name}, ${branch.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  if (!branch) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.modalContainer}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleWrap}>
              <Ionicons name="navigate-circle" size={26} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle} numberOfLines={1}>
                  Chỉ đường trong ứng dụng
                </Text>
                <Text style={s.headerSubtitle} numberOfLines={1}>
                  Đến {branch.name}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>Đang tính toán tuyến đường tốt nhất...</Text>
            </View>
          ) : errorMsg ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.warning} />
              <Text style={s.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={s.externalBtn} onPress={handleOpenExternalMaps}>
                <Ionicons name="map-outline" size={18} color="#FFF" />
                <Text style={s.externalBtnText}>Mở bằng Google Maps</Text>
              </TouchableOpacity>
            </View>
          ) : routeData ? (
            <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Summary Stats */}
              <View style={s.statsRow}>
                <View style={[s.statCard, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name="git-commit-outline" size={20} color={colors.primary} />
                  <View>
                    <Text style={s.statLabel}>KHOẢNG CÁCH</Text>
                    <Text style={[s.statValue, { color: colors.primary }]}>
                      {fmtDistance(routeData.distance)}
                    </Text>
                  </View>
                </View>

                <View style={[s.statCard, { backgroundColor: colors.infoLight }]}>
                  <Ionicons name="time-outline" size={20} color={colors.info} />
                  <View>
                    <Text style={s.statLabel}>THỜI GIAN ĐI</Text>
                    <Text style={[s.statValue, { color: colors.info }]}>
                      {fmtDuration(routeData.duration)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Destination info */}
              <View style={s.destCard}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.destName}>{branch.name}</Text>
                  <Text style={s.destAddress}>{branch.address}</Text>
                </View>
              </View>

              {/* Turn-by-Turn Steps */}
              <Text style={s.sectionHeader}>Chi tiết các bước di chuyển ({routeData.steps.length} bước):</Text>
              <View style={s.stepsList}>
                {routeData.steps.map((step, idx) => (
                  <View key={idx} style={s.stepItem}>
                    <View style={s.stepBadge}>
                      <Text style={s.stepBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={s.stepContent}>
                      <Text style={s.stepInstruction}>{step.instruction}</Text>
                      {step.distance > 0 && (
                        <Text style={s.stepMeta}>
                          {fmtDistance(step.distance)}
                          {step.duration > 30 ? ` · ${fmtDuration(step.duration)}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Open in Native Navigation Button */}
              <TouchableOpacity
                style={s.externalBtn}
                onPress={handleOpenExternalMaps}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={18} color="#FFF" />
                <Text style={s.externalBtnText}>Mở dẫn đường giọng nói Google Maps</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },

  errorBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  errorText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  scrollContent: {
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: borderRadius.lg,
  },
  statLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    marginTop: 2,
  },

  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    padding: 14,
    borderRadius: borderRadius.lg,
    marginBottom: 20,
  },
  destName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  destAddress: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  sectionHeader: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  stepsList: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  stepMeta: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 3,
  },

  externalBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  externalBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

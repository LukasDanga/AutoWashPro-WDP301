import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, G, Text as SvgText, TSpan, Circle, Line } from 'react-native-svg';
import { useAuth } from '../../src/contexts/AuthContext';
import { giftApi } from '../../src/api';
import type { SpinResult } from '../../src/api/gift';
import {
  Text as AppText,
  Card,
  Button,
  Icon,
  Icons,
  ScreenContainer,
  Header,
  AlertDialog,
  useToast,
  BottomSheet,
  BottomNavBar,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';

type WheelItem = {
  id: string;
  name: string;
  color: string;
  weight: number;
  type?: string;
  value?: number;
};

const PALETTE = ['#21C38E', '#299AF1']; // Green, Blue (alternating like the image)

// Standard math for SVG arcs
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const createArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", x, y,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
};

export default function SpinWheelScreen() {
  const router = useRouter();
  const colors = useColors();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();

  const [items, setItems] = useState<WheelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState<number>(0);
  const [prize, setPrize] = useState<SpinResult | null>(null);

  const rotation = useRef(new Animated.Value(0)).current;

  const fetchGifts = useCallback(async () => {
    setIsLoading(true);
    try {
      let gifts = await giftApi.getPublicGifts();
      if (!gifts || gifts.length === 0) {
        gifts = [
          { _id: '1', name: 'GIẢM 50K', type: 'fixed', value: 50000, probability: 10 },
          { _id: '2', name: 'GIẢM 10%', type: 'percentage', value: 10, probability: 20 },
          { _id: '3', name: 'TẶNG PHỦ NANO', type: 'none', probability: 5 },
          { _id: '4', name: 'GIẢM 20K', type: 'fixed', value: 20000, probability: 20 },
          { _id: '5', name: 'CHÚC MAY MẮN', type: 'none', probability: 40 },
          { _id: '6', name: 'HÚT BỤI FREE', type: 'none', probability: 5 },
        ] as any;
      }
      
      const splitText = (text: string) => {
        if (text.length <= 9 || !text.includes(' ')) return text;
        const words = text.split(' ');
        const mid = Math.ceil(words.length / 2);
        return words.slice(0, mid).join(' ') + '\\n' + words.slice(mid).join(' ');
      };
      
      const mapped: WheelItem[] = gifts.map((g: any, idx: number) => {
        // format name nicely for the wheel like the image if it's long
        let displayName = g.name;
        if (g.type === 'percentage') displayName = `GIẢM ${g.value}%`;
        if (g.type === 'fixed') displayName = `GIẢM ${g.value >= 1000 ? g.value/1000 + 'K' : g.value}`;
        
        const finalName = splitText(displayName?.toUpperCase() || 'PHẦN THƯỞNG');
        
        return {
          id: g._id,
          name: finalName,
          color: PALETTE[idx % 2], // alternate Green / Blue
          weight: g.probability ?? 10,
          type: g.type,
          value: g.value,
        };
      });

      // If odd number of items, adjust the last color to a 3rd color so it doesn't clash with the first
      if (mapped.length % 2 !== 0 && mapped.length > 1) {
        mapped[mapped.length - 1].color = '#F59E0B'; // Orange
      }
      
      setItems(mapped);
    } catch (err) {
      console.warn('spin: failed to load gifts', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  useEffect(() => {
    const count = (user as any)?.spinCount;
    if (typeof count === 'number') setSpinCount(count);
  }, [user]);

  const spinTo = useCallback(
    (prizeIndex: number) => {
      const sliceAngle = 360 / items.length;
      // Random offset within the slice
      const jitter = (Math.random() - 0.5) * (sliceAngle * 0.6);
      
      // Pointer is on the RIGHT side (3 o'clock). 
      // In polarToCartesian, 3 o'clock corresponds to 90 degrees.
      // We want the center of the winning slice to align with 90 degrees.
      const centerAngleOfPrize = (prizeIndex + 0.5) * sliceAngle;
      
      // The math: current angle + rotation to bring it to 90
      const target = 360 * 8 + 90 - centerAngleOfPrize + jitter;
      
      Animated.timing(rotation, {
        toValue: target,
        duration: 5000,
        easing: Easing.out(Easing.bezier(0.2, 0.8, 0.1, 1)), // nice smooth deceleration
        useNativeDriver: true,
      }).start();
    },
    [items.length, rotation],
  );

  const handleSpin = async () => {
    if (isSpinning || items.length === 0) return;
    if (!isAuthenticated) {
      AlertDialog.error('Cần đăng nhập', 'Vui lòng đăng nhập để quay thưởng.');
      router.push('/(auth)/login' as any);
      return;
    }
    if (spinCount <= 0) {
      AlertDialog.info(
        'Hết lượt quay',
        'Bạn đã dùng hết lượt quay. Quay lại sau hoặc tích lũy điểm để nhận thêm lượt.',
      );
      return;
    }

    setIsSpinning(true);
    setPrize(null);
    try {
      const result = await giftApi.spin();
      const idx = Math.max(0, items.findIndex((i) => i.id === result.prize?._id));
      spinTo(idx);
      
      // Current rotation target is additive. 
      // After the animation finishes, show the modal.
      setTimeout(() => {
        setPrize(result);
        setSpinCount(result.spinCount);
        setIsSpinning(false);
      }, 5200);
    } catch (err: any) {
      setIsSpinning(false);
      AlertDialog.error(
        'Quay thưởng thất bại',
        err?.response?.data?.message || 'Không thể quay thưởng. Vui lòng thử lại.',
      );
    }
  };

  const renderWheel = () => {
    if (items.length === 0) return null;
    
    const size = 300;
    const center = size / 2;
    const radius = 136;
    const sliceAngle = 360 / items.length;

    return (
      <View style={styles.wheelContainer}>
        <Animated.View
          style={{
            width: size,
            height: size,
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Dark outer ring */}
            <Circle cx={center} cy={center} r={radius + 4} fill="#182233" />
            
            {/* Slices */}
            {items.map((item, idx) => {
              const startAngle = idx * sliceAngle;
              const endAngle = startAngle + sliceAngle;
              const d = createArc(center, center, radius, startAngle, endAngle);
              
              // Text positioning: Center of the slice
              const centerAngle = startAngle + sliceAngle / 2;
              
              return (
                <G key={item.id}>
                  <Path d={d} fill={item.color} stroke="#FFFFFF" strokeWidth={1} />
                  
                  {/* Rotate text so it points outwards */}
                  <G transform={`rotate(${centerAngle}, ${center}, ${center})`}>
                    <SvgText
                      x={center}
                      y={center - radius * 0.65}
                      fill="#FFFFFF"
                      fontSize={item.name.length > 10 ? "11" : "13"}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {item.name.includes('\\n') ? (
                        <>
                          <TSpan x={center} dy="-0.6em">
                            {item.name.split('\\n')[0]}
                          </TSpan>
                          <TSpan x={center} dy="1.2em">
                            {item.name.split('\\n')[1]}
                          </TSpan>
                        </>
                      ) : (
                        <TSpan x={center} dy="0">
                          {item.name}
                        </TSpan>
                      )}
                    </SvgText>
                  </G>
                  
                  {/* Grey ticks on the outer ring at the boundary of each slice */}
                  <Line 
                    x1={polarToCartesian(center, center, radius, startAngle).x} 
                    y1={polarToCartesian(center, center, radius, startAngle).y}
                    x2={polarToCartesian(center, center, radius + 8, startAngle).x}
                    y2={polarToCartesian(center, center, radius + 8, startAngle).y}
                    stroke="#D1D5DB"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                </G>
              );
            })}
            
            {/* Center Hub */}
            <Circle cx={center} cy={center} r={28} fill="#E5E7EB" stroke="#D1D5DB" strokeWidth={4} />
            <Circle cx={center} cy={center} r={6} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        {/* Pointer Pin on the right side (3 o'clock) */}
        <View style={styles.pointerContainer}>
          <Svg width={40} height={40} viewBox="0 0 40 40">
            {/* Pin shadow */}
            <Path d="M 0 20 L 26 8 A 12 12 0 1 1 26 32 Z" fill="rgba(0,0,0,0.15)" transform="translate(0, 3)" />
            {/* Pin body */}
            <Path d="M 0 20 L 26 8 A 12 12 0 1 1 26 32 Z" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth={1} />
            {/* Inner dot */}
            <Circle cx={27} cy={20} r={4} fill="#9CA3AF" />
          </Svg>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <Header showBack title="Vòng quay may mắn" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <Card style={styles.heroCard}>
          <AppText variant="h2" style={styles.heroTitle}>Vòng quay may mắn</AppText>
          <AppText variant="bodySmall" color="textSecondary" style={styles.heroSub}>
            Mỗi lượt quay là một cơ hội nhận voucher giảm giá hấp dẫn. Tích lũy điểm để có thêm lượt quay nhé!
          </AppText>
          <View style={styles.spinCountRow}>
            <View style={[styles.spinBadge, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.refreshOutline} size={16} color={colors.primary} />
              <AppText variant="bodySmall" style={{ color: colors.primary, marginLeft: 4, fontWeight: '700' }}>
                {spinCount} lượt
              </AppText>
            </View>
          </View>
        </Card>

        {/* Wheel */}
        <View style={styles.wheelWrapper}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            renderWheel()
          )}
        </View>

        {/* Spin button */}
        <Button
          title={isSpinning ? 'Đang quay...' : 'QUAY NGAY'}
          onPress={handleSpin}
          loading={isSpinning}
          disabled={isSpinning || items.length === 0}
          fullWidth
          size="large"
          style={{ marginTop: spacing.xl }}
        />

        <AppText variant="caption" color="textSecondary" style={styles.fineprint}>
          Kết quả quay được quyết định ngẫu nhiên dựa trên xác suất của từng phần thưởng.
        </AppText>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />

      {/* Prize modal */}
      <BottomSheet
        visible={!!prize}
        onClose={() => setPrize(null)}
        title="Chúc mừng bạn!"
      >
        <View style={styles.modalCard}>
            <View style={[styles.prizeBadge, { backgroundColor: colors.primarySubtle }]}>
              <Icon name={Icons.gift} size={32} color={colors.primary} />
            </View>
            <AppText variant="h3" style={styles.modalTitle}>
              {prize?.prize?.type === 'none' ? 'Thông báo' : 'Chúc mừng bạn!'}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.modalSubtitle}>
              Bạn đã quay trúng:
            </AppText>
            <AppText variant="h2" style={[styles.prizeName, { color: colors.primary }]}>
              {prize?.prize?.name || '—'}
            </AppText>

            {prize?.voucher && (
              <Card style={styles.voucherCard} padding="md">
                <AppText variant="overline" color="textSecondary">Mã voucher</AppText>
                <AppText variant="h3" style={styles.voucherCode}>{prize.voucher.code}</AppText>
                {prize.voucher.endDate && (
                  <AppText variant="caption" color="textSecondary">
                    HSD: {new Date(prize.voucher.endDate).toLocaleDateString('vi-VN')}
                  </AppText>
                )}
              </Card>
            )}

            <View style={styles.modalActions}>
              <Button
                title={prize?.voucher ? "Xem ưu đãi của tôi" : "Đóng"}
                onPress={() => {
                  setPrize(null);
                  if (prize?.voucher) router.push('/(tabs)/rewards' as any);
                }}
                fullWidth
              />
            </View>
          </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  heroCard: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  heroTitle: {
    marginBottom: 4,
  },
  heroSub: {
    marginBottom: spacing.md,
  },
  spinCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    minHeight: 340,
  },
  wheelContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    right: -10, // Overlaps the right edge slightly
    top: '50%',
    marginTop: -20, // half of SVG height
    zIndex: 10,
  },
  fineprint: {
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  modalCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  prizeBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginBottom: spacing.xs,
  },
  prizeName: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '800',
  },
  voucherCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  voucherCode: {
    fontWeight: '800',
    letterSpacing: 2,
    marginVertical: 4,
  },
  modalActions: {
    width: '100%',
    marginTop: spacing.sm,
  },
});

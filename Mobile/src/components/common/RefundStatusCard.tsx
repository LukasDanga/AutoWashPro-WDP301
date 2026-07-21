import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { formatCurrency } from '../../utils';
import Icon, { Icons } from './Icon';

// Pull refund amount from any plausible BE field name.
// BE schema currently doesn't store amount on the RefundRequest doc itself —
// it lives on the populated booking (bookingId.finalPrice). We resolve in this order:
//   1. request.refundAmount / amount (future-proof if BE adds the field)
//   2. request.bookingId.finalPrice / totalPrice (current populated shape)
//   3. request.refundAmount  (legacy)
//   4. 0
function resolveRefundAmount(req: RefundStatusCardProps['request']): number {
  const b = typeof req.bookingId === 'object' ? req.bookingId : null;
  const isDepositOnly = b?.paymentStatus === 'deposit_paid' || (b?.depositPaid && b?.paymentStatus !== 'paid');
  const actualDeposit = b?.depositAmount || (b as any)?.deposit;

  const candidates = [
    req.refundAmount,
    (req as any).amount,
    isDepositOnly && actualDeposit ? actualDeposit : null,
    b?.finalPrice,
    b?.totalPrice,
    (req as any).refundAmount,
  ];
  for (const v of candidates) {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (!isNaN(n) && n > 0) return n;
  }
  return 0;
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface RefundStatusCardProps {
  request: {
    _id?: string;
    id?: string;
    status?: string;
    reason?: string;
    refundAmount?: number;
    amount?: number;
    createdAt?: string;
    managerReply?: string;
    reviewNote?: string;
    processedAt?: string;
    updatedAt?: string;
    // BE currently populates bookingId with selected fields including finalPrice.
    bookingId?: {
      _id?: string;
      finalPrice?: number;
      totalPrice?: number;
    } | string;
    [k: string]: any;
  };
  /** Optional callback for "View history" or "Cancel request" tap */
  onViewHistory?: () => void;
}

type StatusKey = 'pending' | 'processing' | 'approved' | 'completed' | 'rejected' | 'unknown';

function deriveStatus(raw?: string): StatusKey {
  if (!raw) return 'pending';
  const s = raw.toLowerCase().trim();
  if (s.includes('reject') || s.includes('denied') || s === 'failed' || s === 'cancelled') return 'rejected';
  if (s.includes('complete') || s.includes('refunded') || s.includes('success')) return 'completed';
  if (s.includes('process') || s.includes('reviewing') || s.includes('in_review')) return 'processing';
  if (s.includes('approve') || s.includes('accept') || s === 'accepted') return 'approved';
  if (s === 'pending' || s === 'open' || s === 'new' || s === 'requested') return 'pending';
  return 'unknown';
}

// Editorial luxury palette — calm sky → confident emerald → serious crimson → quiet slate.
// Each tone has: [gradient-start, gradient-end, hero-text, body-tint, accent-text, dot-color]
const STATUS_META: Record<
  StatusKey,
  {
    label: string;
    eyebrow: string;
    gradient: [string, string];
    heroText: string;
    bodyTint: string;
    accentText: string;
    dotColor: string;
    iconBg: string;
    iconColor: string;
    divider: string;
    chipBg: string;
    chipBorder: string;
    subtitle: string;
    icon: string;
  }
> = {
  pending: {
    label: 'Đang chờ xử lý',
    eyebrow: 'YÊU CẦU HOÀN TIỀN',
    gradient: ['#0EA5E9', '#2563EB'],
    heroText: '#FFFFFF',
    bodyTint: '#F0F9FF',
    accentText: '#0369A1',
    dotColor: '#0EA5E9',
    iconBg: '#FFFFFF',
    iconColor: '#0284C7',
    divider: 'rgba(2,132,199,0.12)',
    chipBg: '#E0F2FE',
    chipBorder: '#BAE6FD',
    subtitle:
      'Yêu cầu đã được ghi nhận. Đội ngũ hỗ trợ sẽ phản hồi trong vòng 24 giờ làm việc.',
    icon: Icons.time,
  },
  processing: {
    label: 'Đang xem xét',
    eyebrow: 'YÊU CẦU HOÀN TIỀN',
    gradient: ['#0EA5E9', '#1D4ED8'],
    heroText: '#FFFFFF',
    bodyTint: '#F0F9FF',
    accentText: '#075985',
    dotColor: '#1D4ED8',
    iconBg: '#FFFFFF',
    iconColor: '#1D4ED8',
    divider: 'rgba(29,78,216,0.12)',
    chipBg: '#DBEAFE',
    chipBorder: '#BFDBFE',
    subtitle: 'Chúng tôi đang kiểm tra chi tiết đơn hàng của bạn.',
    icon: Icons.refresh,
  },
  approved: {
    label: 'Đã chấp nhận',
    eyebrow: 'HOÀN TIỀN ĐƯỢC DUYỆT',
    gradient: ['#10B981', '#047857'],
    heroText: '#FFFFFF',
    bodyTint: '#ECFDF5',
    accentText: '#065F46',
    dotColor: '#10B981',
    iconBg: '#FFFFFF',
    iconColor: '#047857',
    divider: 'rgba(16,185,129,0.14)',
    chipBg: '#D1FAE5',
    chipBorder: '#A7F3D0',
    subtitle: 'Yêu cầu đã được duyệt. Tiền sẽ về tài khoản trong 1–3 ngày làm việc.',
    icon: Icons.success,
  },
  completed: {
    label: 'Hoàn tiền thành công',
    eyebrow: 'ĐÃ HOÀN TẤT',
    gradient: ['#059669', '#065F46'],
    heroText: '#FFFFFF',
    bodyTint: '#ECFDF5',
    accentText: '#064E3B',
    dotColor: '#059669',
    iconBg: '#FFFFFF',
    iconColor: '#047857',
    divider: 'rgba(5,150,105,0.14)',
    chipBg: '#D1FAE5',
    chipBorder: '#A7F3D0',
    subtitle: 'Tiền đã được hoàn về tài khoản thanh toán của bạn.',
    icon: Icons.success,
  },
  rejected: {
    label: 'Bị từ chối',
    eyebrow: 'KHÔNG ĐƯỢC CHẤP NHẬN',
    gradient: ['#EF4444', '#991B1B'],
    heroText: '#FFFFFF',
    bodyTint: '#FEF2F2',
    accentText: '#991B1B',
    dotColor: '#EF4444',
    iconBg: '#FFFFFF',
    iconColor: '#B91C1C',
    divider: 'rgba(239,68,68,0.12)',
    chipBg: '#FEE2E2',
    chipBorder: '#FECACA',
    subtitle:
      'Yêu cầu hoàn tiền không được chấp nhận. Liên hệ hỗ trợ để biết thêm chi tiết.',
    icon: Icons.close,
  },
  unknown: {
    label: 'Đã gửi yêu cầu',
    eyebrow: 'YÊU CẦU HOÀN TIỀN',
    gradient: ['#475569', '#1E293B'],
    heroText: '#FFFFFF',
    bodyTint: '#F8FAFC',
    accentText: '#0F172A',
    dotColor: '#64748B',
    iconBg: '#FFFFFF',
    iconColor: '#475569',
    divider: 'rgba(100,116,139,0.14)',
    chipBg: '#F1F5F9',
    chipBorder: '#E2E8F0',
    subtitle: 'Yêu cầu hoàn tiền đã được ghi nhận trong hệ thống.',
    icon: Icons.info,
  },
};

function formatDateTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi} • ${dd}/${mm}/${yyyy}`;
  } catch {
    return null;
  }
}

function formatRelativeTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso).getTime();
    if (isNaN(d)) return null;
    const diff = Date.now() - d;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Vừa xong';
    if (min < 60) return `${min} phút trước`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} giờ trước`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} ngày trước`;
    return null;
  } catch {
    return null;
  }
}

// ── Pulsing live dot (uses RN's Animated, no external deps) ──────────────────
const LivePulse: React.FC<{ color: string; isLive: boolean }> = ({ color, isLive }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLive, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={liveStyles.wrap}>
      {isLive ? (
        <Animated.View
          style={[
            liveStyles.ring,
            { backgroundColor: color, transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
      ) : null}
      <View style={[liveStyles.dot, { backgroundColor: color }]} />
    </View>
  );
};

const liveStyles = StyleSheet.create({
  wrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

export const RefundStatusCard: React.FC<RefundStatusCardProps> = ({ request, onViewHistory }) => {
  const statusKey = useMemo(() => deriveStatus(request.status), [request.status]);
  const meta = STATUS_META[statusKey];
  const amount = resolveRefundAmount(request);
  const amountText = amount > 0 ? formatCurrency(amount) : '— —';
  const shortId = (request._id || request.id || '').slice(-8).toUpperCase() || '———';
  const submittedAt = formatDateTime(request.createdAt);
  const submittedRelative = formatRelativeTime(request.createdAt);
  const processedAt = formatDateTime(request.processedAt || request.updatedAt);
  const isLive = statusKey === 'pending' || statusKey === 'processing';

  // Entry animation: fade + slight rise on mount.
  const entry = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entry, {
      toValue: 1,
      duration: 520,
      easing: Easing.bezier(0.16, 1, 0.3, 1), // smooth-out / expo-out
      useNativeDriver: true,
    }).start();
  }, [entry]);

  const animatedStyle = {
    opacity: entry,
    transform: [
      {
        translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
      },
    ],
  };

  const replyText = request.managerReply || request.reviewNote || request.reply;

  return (
    <Animated.View style={[styles.shellOuter, animatedStyle]}>
      {/* Double-bezel outer shell */}
      <View style={styles.shellBorder}>
        {/* Inner core */}
        <View style={styles.core}>
          {/* Hero strip — gradient with decorative mesh */}
          <LinearGradient
            colors={meta.gradient as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {/* Decorative mesh blobs */}
            <View style={[styles.meshBlob, { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
            <View
              style={[
                styles.meshBlob2,
                { backgroundColor: 'rgba(255,255,255,0.08)' },
              ]}
            />
            <View
              style={[
                styles.meshBlob3,
                { backgroundColor: 'rgba(255,255,255,0.06)' },
              ]}
            />

            <View style={styles.heroTopRow}>
              <View style={styles.heroIconBubble}>
                <Icon name={meta.icon} size={20} color={meta.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>{meta.eyebrow}</Text>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {meta.label}
                  </Text>
                  {isLive ? (
                    <View style={styles.liveChip}>
                      <LivePulse color="#FFFFFF" isLive />
                      <Text style={styles.liveChipText}>Live</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Body */}
          <View style={[styles.body, { backgroundColor: meta.bodyTint }]}>
            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: meta.accentText }]}>{meta.subtitle}</Text>

            {/* Hairline divider */}
            <View style={[styles.hairline, { backgroundColor: meta.divider }]} />

            {/* Amount block — editorial hero */}
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: meta.accentText }]}>
                Số tiền dự kiến hoàn
              </Text>
              <Text
                style={[styles.amountValue, { color: meta.accentText }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {amountText}
              </Text>
              <View style={styles.amountMetaRow}>
                <Text style={[styles.amountMeta, { color: meta.accentText }]}>
                  Mã yêu cầu
                </Text>
                <Text
                  style={[styles.amountMetaValue, { color: meta.accentText }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  #{shortId}
                </Text>
              </View>
            </View>

            {/* Hairline */}
            <View style={[styles.hairline, { backgroundColor: meta.divider }]} />

            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineRow}>
                <View style={styles.timelineDotWrap}>
                  <View style={[styles.timelineDot, { backgroundColor: meta.dotColor }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineLabel}>Yêu cầu đã gửi</Text>
                  <Text style={styles.timelineValue}>
                    {submittedAt || 'Vừa xong'}
                    {submittedRelative && submittedAt ? `  ·  ${submittedRelative}` : ''}
                  </Text>
                </View>
              </View>
              {processedAt ? (
                <View style={styles.timelineRow}>
                  <View style={styles.timelineDotWrap}>
                    <View style={[styles.timelineDot, { backgroundColor: meta.accentText }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineLabel}>Cập nhật gần nhất</Text>
                    <Text style={styles.timelineValue}>{processedAt}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Reason quote */}
            {request.reason ? (
              <>
                <View style={[styles.hairline, { backgroundColor: meta.divider }]} />
                <View style={styles.reasonBlock}>
                  <View style={styles.reasonHeader}>
                    <Icon name={Icons.document} size={13} color={meta.accentText} />
                    <Text style={[styles.reasonLabel, { color: meta.accentText }]}>
                      Lý do bạn đã gửi
                    </Text>
                  </View>
                  <Text style={styles.reasonQuote}>&ldquo;{request.reason}&rdquo;</Text>
                </View>
              </>
            ) : null}

            {/* Manager reply */}
            {replyText ? (
              <>
                <View style={[styles.hairline, { backgroundColor: meta.divider }]} />
                <View
                  style={[
                    styles.replyBlock,
                    {
                      backgroundColor: meta.chipBg,
                      borderColor: meta.chipBorder,
                    },
                  ]}
                >
                  <View style={styles.reasonHeader}>
                    <Icon name={Icons.help} size={13} color={meta.accentText} />
                    <Text style={[styles.reasonLabel, { color: meta.accentText }]}>
                      Phản hồi từ quản lý
                    </Text>
                  </View>
                  <Text style={[styles.replyText, { color: '#0F172A' }]}>{replyText}</Text>
                </View>
              </>
            ) : null}

            {/* Footer note / action */}
            {onViewHistory ? (
              <>
                <View style={[styles.hairline, { backgroundColor: meta.divider }]} />
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.create(
                        280,
                        LayoutAnimation.Types.easeInEaseOut,
                        LayoutAnimation.Properties.opacity,
                      ),
                    );
                    onViewHistory();
                  }}
                  style={({ pressed }) => [
                    styles.historyRow,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Xem lịch sử hoàn tiền"
                >
                  <Text style={[styles.historyLabel, { color: meta.accentText }]}>
                    Xem lịch sử hoàn tiền
                  </Text>
                  <Icon name={Icons.forward} size={14} color={meta.accentText} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shellOuter: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  // Outer shell — hairlined bezel + soft cushion
  shellBorder: {
    borderRadius: 28,
    padding: 2,
    backgroundColor: 'rgba(15,23,42,0.06)',
    ...shadows.md,
  },
  core: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  meshBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -60,
    right: -40,
  },
  meshBlob2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -40,
    left: -10,
  },
  meshBlob3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 20,
    left: 80,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 2,
  },
  heroIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  heroEyebrow: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  heroTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  liveChipText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  amountBlock: {
    paddingVertical: 4,
  },
  amountLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  amountValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 30,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  amountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  amountMeta: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  amountMetaValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  timeline: {
    paddingVertical: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timelineDotWrap: {
    width: 14,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  timelineValue: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  reasonBlock: {
    paddingVertical: 4,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasonLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  reasonQuote: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#0F172A',
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  replyBlock: {
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
  },
  replyText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  historyLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
});

export default RefundStatusCard;
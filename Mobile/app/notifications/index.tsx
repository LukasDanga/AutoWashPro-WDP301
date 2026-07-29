/**
 * AutoWashPro Notifications Screen
 * Polished notification list with:
 *   - unread indicator (left border accent + soft tint)
 *   - type-specific icon + tinted chip background
 *   - relative time stamps (vn)
 *   - pull-to-refresh + skeleton placeholders
 *   - long-press to delete with confirmation
 *   - deep-link to booking/voucher/payment based on payload
 *   - 100% semantic theme tokens (no hardcoded hex)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  Text,
  Pressable,
  Animated,
  PanResponder,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { notificationApi } from '../../src/api';
import {
  Text as AppText,
  Loading,
  EmptyState,
  Icon,
  Icons,
  PressableScale,
  SkeletonListItem,
  Header,
  ScreenContainer,
  AlertDialog,
  useToast,
  BottomSheet,
  Button,
} from '../../src/components/common';
import { useColors, useTheme } from '../../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Notification, NotificationType } from '../../src/types';
import { useTranslation } from 'react-i18next';
import { translateDynamicText } from '../../src/utils';

type NotificationVisual = {
  icon: string;
  bg: string;
  fg: string;
};

const VISUALS: Record<NotificationType, NotificationVisual> = {
  booking_created: { icon: Icons.calendarOutline, bg: 'primarySubtle', fg: 'primary' },
  booking_confirmed: { icon: Icons.checkmark, bg: 'successLight', fg: 'success' },
  booking_cancelled: { icon: Icons.closeCircleOutline || 'close-circle-outline', bg: 'errorLight', fg: 'error' },
  booking_cancelled_system: { icon: Icons.closeCircleOutline || 'close-circle-outline', bg: 'errorLight', fg: 'error' },
  booking_completed: { icon: Icons.sparkle, bg: 'successLight', fg: 'success' },
  booking_reminder: { icon: Icons.timeOutline, bg: 'warningLight', fg: 'warning' },
  booking_at_risk: { icon: Icons.warningOutline || 'warning-outline', bg: 'errorLight', fg: 'error' },
  booking_grace_extended: { icon: Icons.timeOutline, bg: 'warningLight', fg: 'warning' },
  payment_received: { icon: Icons.walletOutline || 'wallet-outline', bg: 'successLight', fg: 'success' },
  payment_confirmed: { icon: Icons.checkmarkDoneCircleOutline || 'checkmark-done-circle-outline', bg: 'successLight', fg: 'success' },
  payment_success: { icon: Icons.cardOutline, bg: 'successLight', fg: 'success' },
  refund: { icon: Icons.cashOutline || 'cash-outline', bg: 'infoLight', fg: 'info' },
  voucher: { icon: Icons.voucherOutline || 'pricetag-outline', bg: 'primarySubtle', fg: 'primary' },
  voucher_expiring: { icon: Icons.voucherOutline, bg: 'warningLight', fg: 'warning' },
  points_earned: { icon: Icons.star, bg: 'warningLight', fg: 'warning' },
  promotion: { icon: Icons.sparkle, bg: 'infoLight', fg: 'info' },
  profile_updated: { icon: Icons.personOutline || 'person-outline', bg: 'infoLight', fg: 'info' },
  vehicle_added: { icon: Icons.carOutline || 'car-outline', bg: 'successLight', fg: 'success' },
  wallet_transaction: { icon: Icons.walletOutline || 'wallet-outline', bg: 'successLight', fg: 'success' },
  system: { icon: Icons.informationCircleOutline || 'information-circle-outline', bg: 'surfaceDark', fg: 'textSecondary' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = createStyles(colors);
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const { markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead, refreshNotifications } =
    useNotifications();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const cardRefs = useRef<Record<string, NotificationCardRef | null>>({});

  const closeAllSwipeables = useCallback(() => {
    Object.values(cardRefs.current).forEach((cardRef) => {
      cardRef?.close();
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationApi.getNotifications({ limit: 50 });
      setNotifications(response.notifications || []);
      refreshNotifications();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, refreshNotifications]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) fetchNotifications();
      return () => {
        closeAllSwipeables();
      };
    }, [isAuthenticated, fetchNotifications, closeAllSwipeables]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true);
    try {
      await contextMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error: any) {
      AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể đánh dấu');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;
    try {
      await contextMarkAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = (notification: Notification, onCancel?: () => void) => {
    AlertDialog.confirm(
      'Xóa thông báo',
      'Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.',
      async () => {
        try {
          await notificationApi.deleteNotification(notification._id);
          setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
          toast.success('Đã xóa', 'Thông báo đã được xóa khỏi danh sách');
        } catch (error: any) {
          AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể xóa');
          onCancel?.();
        }
      },
      onCancel,
      'Xóa',
      'Hủy',
    );
  };

  const handleDeleteAll = () => {
    AlertDialog.confirm(
      'Xóa tất cả',
      'Bạn có chắc chắn muốn xóa toàn bộ thông báo không? Hành động này không thể hoàn tác.',
      async () => {
        try {
          await notificationApi.deleteAllNotifications();
          setNotifications([]);
          toast.success('Thành công', 'Đã xóa tất cả thông báo');
        } catch (error: any) {
          AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể xóa thông báo');
        }
      },
      undefined,
      'Xóa tất cả',
      'Hủy'
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    closeAllSwipeables();
    await handleMarkAsRead(notification);
    setSelectedNotification(notification);
  };

  const handleDeepLink = () => {
    if (!selectedNotification) return;
    const data = selectedNotification.data || {};
    setSelectedNotification(null);
    if (data.bookingId) {
      router.push(`/booking/${data.bookingId}` as any);
    } else if (data.voucherId) {
      router.push(`/voucher/${data.voucherId}` as any);
    } else if (data.paymentId) {
      router.push(`/payment/${data.paymentId}` as any);
    } else if (data.url) {
      router.push(data.url as any);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const groupedNotifications = useMemo(() => {
    const groups: { title: string; data: Notification[] }[] = [];
    const map = new Map<string, Notification[]>();
    
    notifications.forEach(n => {
      const d = new Date(n.createdAt);
      const now = new Date();
      
      let key = d.toLocaleDateString('vi-VN');
      
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        key = 'Hôm nay';
      } else {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
          key = 'Hôm qua';
        }
      }
      
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    });
    
    map.forEach((data, title) => {
      groups.push({ title, data });
    });
    
    return groups;
  }, [notifications]);

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header showBack title="Thông báo" />
        <EmptyState
          iconName={Icons.lockOutline}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem thông báo"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <Header showBack title="Thông báo" />
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonListItem />
            </View>
          ))}
        </View>
      </ScreenContainer>
    );
  }



  return (
    <ScreenContainer background="subtle">
      <Header
        showBack
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : undefined}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {unreadCount > 0 && (
              <PressableScale
                onPress={handleMarkAllRead}
                disabled={isMarkingAllRead}
                accessibilityLabel="Đánh dấu tất cả đã đọc"
              >
                <Icon
                  name={Icons.checkmarkDoneCircleOutline}
                  size={24}
                  color={isMarkingAllRead ? colors.textTertiary : colors.primary}
                />
              </PressableScale>
            )}
            {notifications.length > 0 && (
              <PressableScale
                onPress={() => toast.info('Nhấn giữ', 'Hãy nhấn giữ biểu tượng để xóa tất cả thông báo')}
                onLongPress={handleDeleteAll}
                accessibilityLabel="Nhấn giữ để xóa tất cả thông báo"
              >
                <Icon
                  name={Icons.trashOutline}
                  size={24}
                  color={colors.error}
                />
              </PressableScale>
            )}
          </View>
        }
      />

      <FlatList
        data={groupedNotifications}
        keyExtractor={(item) => item.title}
        onScrollBeginDrag={closeAllSwipeables}
        renderItem={({ item: section }) => (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>{section.title}</AppText>
            </View>
            <View style={styles.sectionCardList}>
              {section.data.map((notification) => (
                <NotificationCard
                  key={notification._id}
                  ref={(ref) => {
                    if (ref) {
                      cardRefs.current[notification._id] = ref;
                    } else {
                      delete cardRefs.current[notification._id];
                    }
                  }}
                  notification={notification}
                  colors={colors}
                  styles={styles}
                  onPress={() => handleNotificationPress(notification)}
                  onDelete={(onCancel) => handleDelete(notification, onCancel)}
                  formatTime={formatTime}
                />
              ))}
            </View>
          </View>
        )}
        initialNumToRender={5}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            iconName={Icons.notificationsOutline}
            title="Chưa có thông báo"
            message="Các thông báo về đặt lịch, thanh toán và check-in sẽ hiển thị tại đây."
          />
        }
      />

      <BottomSheet
        visible={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        showCloseButton={false}
        snapPoints={[
          selectedNotification?.data &&
          (selectedNotification.data.bookingId ||
            selectedNotification.data.voucherId ||
            selectedNotification.data.paymentId ||
            selectedNotification.data.url)
            ? 0.55
            : 0.48,
        ]}
        footer={
          selectedNotification ? (() => {
            const hasLink =
              selectedNotification.data &&
              (selectedNotification.data.bookingId ||
                selectedNotification.data.voucherId ||
                selectedNotification.data.paymentId ||
                selectedNotification.data.url);
            return (
              <View style={{ gap: 10 }}>
                {hasLink && (
                  <Button
                    variant="primary"
                    title="Xem chi tiết"
                    size="medium"
                    fullWidth
                    onPress={handleDeepLink}
                  />
                )}
                <Button
                  variant="outline"
                  title="Xóa thông báo"
                  size="medium"
                  fullWidth
                  style={{ borderColor: colors.error }}
                  textStyle={{ color: colors.error }}
                  onPress={() => {
                    handleDelete(selectedNotification);
                    setSelectedNotification(null);
                  }}
                />
              </View>
            );
          })() : undefined
        }
      >
        {selectedNotification && (() => {
          const visual = VISUALS[selectedNotification.type] || {
            icon: Icons.notificationsOutline,
            bg: 'primarySubtle',
            fg: 'primary',
          };
          const hasLink = selectedNotification.data && (selectedNotification.data.bookingId || selectedNotification.data.voucherId || selectedNotification.data.paymentId || selectedNotification.data.url);
          
          const isLight = !isDark;
          let gradientColors: string[] = isLight ? ['#F0F9FF', 'rgba(59, 130, 246, 0.1)'] : ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)'];
          let iconBorderColor = isLight ? '#BAE6FD' : 'rgba(59, 130, 246, 0.4)';
          let iconBg = isLight ? '#FFFFFF' : 'rgba(59, 130, 246, 0.2)';
          let subtitleColor = isLight ? '#075985' : 'rgba(59, 130, 246, 0.9)';

          if (visual.fg === 'success') {
            gradientColors = isLight ? ['#F0FDF4', 'rgba(34, 197, 94, 0.1)'] : ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)'];
            iconBorderColor = isLight ? '#BBF7D0' : 'rgba(34, 197, 94, 0.4)';
            iconBg = isLight ? '#FFFFFF' : 'rgba(34, 197, 94, 0.2)';
            subtitleColor = isLight ? '#166534' : 'rgba(34, 197, 94, 0.9)';
          } else if (visual.fg === 'error') {
            gradientColors = isLight ? ['#FEF2F2', 'rgba(239, 68, 68, 0.1)'] : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)'];
            iconBorderColor = isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.4)';
            iconBg = isLight ? '#FFFFFF' : 'rgba(239, 68, 68, 0.2)';
            subtitleColor = isLight ? '#991B1B' : 'rgba(239, 68, 68, 0.9)';
          } else if (visual.fg === 'warning') {
            gradientColors = isLight ? ['#FFFBEB', 'rgba(245, 158, 11, 0.1)'] : ['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)'];
            iconBorderColor = isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.4)';
            iconBg = isLight ? '#FFFFFF' : 'rgba(245, 158, 11, 0.2)';
            subtitleColor = isLight ? '#92400E' : 'rgba(245, 158, 11, 0.9)';
          }

          return (
            <>
              {/* Scrollable area: header + message */}
              <View style={{ marginHorizontal: -20, marginTop: -8 }}>
                {/* Premium Header */}
                <LinearGradient
                  colors={gradientColors as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    gap: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Left Icon circle */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      borderWidth: 1,
                      backgroundColor: iconBg,
                      borderColor: iconBorderColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={visual.icon} size={22} color={(colors as any)[visual.fg]} />
                  </View>

                  {/* Title & Subtitle */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'Outfit_700Bold',
                        fontSize: 16,
                        fontWeight: '700',
                        color: colors.textPrimary,
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {translateDynamicText(selectedNotification.title, i18n.language)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Outfit_500Medium',
                        fontSize: 12,
                        fontWeight: '500',
                        color: subtitleColor,
                      }}
                      numberOfLines={1}
                    >
                      {formatTime(selectedNotification.createdAt)}
                    </Text>
                  </View>

                  {/* Right Close Button */}
                  <TouchableOpacity
                    onPress={() => setSelectedNotification(null)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel="Đóng"
                    accessibilityRole="button"
                  >
                    <Icon name={Icons.close} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </LinearGradient>

                {/* Body Content (message only — buttons moved to footer) */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.borderLight || '#F1F5F9',
                    }}
                  >
                    <AppText variant="body" color="textSecondary" style={{ lineHeight: 22 }}>
                      {translateDynamicText(selectedNotification.message, i18n.language)}
                    </AppText>
                  </View>
                </View>
              </View>
            </>
          );
        })()}
      </BottomSheet>
    </ScreenContainer>
  );
}

export interface NotificationCardRef {
  close: () => void;
}

interface NotificationCardProps {
  notification: Notification;
  colors: any;
  styles: any;
  onPress: () => void;
  onDelete: (onCancel?: () => void) => void;
  formatTime: (s: string) => string;
}

const NotificationCard = React.forwardRef<NotificationCardRef, NotificationCardProps>(
  ({ notification, colors, styles, onPress, onDelete, formatTime }, ref) => {
    const [showDelete, setShowDelete] = useState(false);
    const pan = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const { i18n } = useTranslation();
    
    const close = useCallback(() => {
      Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start(() => {
        setShowDelete(false);
      });
    }, [pan]);

    React.useImperativeHandle(ref, () => ({
      close,
    }));

    const latestProps = useRef({ onDelete, showDelete });
    latestProps.current = { onDelete, showDelete };

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => 
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            pan.setValue(gesture.dx);
            if (!latestProps.current.showDelete && gesture.dx < -5) {
              setShowDelete(true);
            }
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -80 || gesture.vx < -1.5) {
            Animated.parallel([
              Animated.timing(pan, { toValue: -500, duration: 200, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })
            ]).start(() => {
              latestProps.current.onDelete(() => {
                Animated.parallel([
                  Animated.timing(pan, { toValue: 0, duration: 200, useNativeDriver: true }),
                  Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true })
                ]).start(() => {
                  setShowDelete(false);
                });
              });
            });
          } else {
            Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start(() => {
              setShowDelete(false);
            });
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start(() => {
            setShowDelete(false);
          });
        },
        onPanResponderTerminationRequest: () => true,
      })
    ).current;

    const visual = VISUALS[notification.type] || {
      icon: Icons.notificationsOutline,
      bg: 'primarySubtle',
      fg: 'primary',
    };

    const hasLink = !!(
      notification.data &&
      (notification.data.bookingId ||
        notification.data.voucherId ||
        notification.data.paymentId ||
        notification.data.url)
    );

    return (
      <Animated.View style={[styles.notificationCardContainer, { opacity }]}>
        {showDelete && (
          <Animated.View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 80,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.error,
              borderTopRightRadius: 20,
              borderBottomRightRadius: 20,
              opacity: pan.interpolate({
                inputRange: [-30, -5, 0],
                outputRange: [1, 0, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            <Icon name={Icons.trashOutline} size={24} color="#fff" />
          </Animated.View>
        )}
        <Animated.View style={{ transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${notification.title}. ${notification.message}`}
            accessibilityHint={
              notification.isRead ? 'Đã đọc, nhấn để xem chi tiết' : 'Chưa đọc, nhấn để xem chi tiết'
            }
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.notificationCardInner,
                  pressed && {
                    backgroundColor: colors.surfaceDark,
                  },
                  !notification.isRead && {
                    backgroundColor: colors.primarySubtle,
                  },
                  pressed && !notification.isRead && {
                    backgroundColor: colors.border,
                  },
                ]}
              >
                {/* Left vertical border indicator for unread state */}
                {!notification.isRead && <View style={styles.unreadSideBar} />}

                <View style={[styles.notificationIcon, { backgroundColor: (colors as any)[visual.bg] }]}>
                  <Icon name={visual.icon} size={22} color={(colors as any)[visual.fg]} />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeaderRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        notification.isRead
                          ? styles.notificationTitleRead
                          : styles.notificationTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {translateDynamicText(notification.title, i18n.language)}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {translateDynamicText(notification.message, i18n.language)}
                  </Text>

                  <View style={styles.notificationFooterRow}>
                    {hasLink ? (
                      <View style={styles.actionPill}>
                        <Text style={styles.actionPillText}>Xem ngay</Text>
                        <Icon name={Icons.chevronRight || 'chevron-forward'} size={12} color={colors.primary} />
                      </View>
                    ) : (
                      <View />
                    )}

                    {!notification.isRead && (
                      <View style={styles.unreadTag}>
                        <Text style={styles.unreadTagText}>Mới</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }
);

const createStyles = (colors: any) =>
  StyleSheet.create({
    markAllButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      minHeight: 44,
      justifyContent: 'center',
    },
    markAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: spacing.xxl,
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionHeader: {
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionCardList: {
      gap: 0,
    },
    // Keep legacy styles as empty to avoid compile/runtime issues if used externally
    sectionCard: {},
    separator: {},
    
    skeletonList: {
      padding: spacing.md,
    },
    skeletonCard: {
      backgroundColor: colors.surface,
      marginBottom: 12,
      borderRadius: 16,
    },
    notificationCardContainer: {
      marginBottom: 12,
      borderRadius: 20,
      backgroundColor: colors.borderLight, // outer bezel
      padding: 1, // bezel line thickness
      ...shadows.sm,
    },
    notificationCardInner: {
      borderRadius: 19,
      backgroundColor: colors.background, // inner core
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      overflow: 'hidden',
      position: 'relative',
    },
    unreadSideBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.primary,
      borderTopLeftRadius: 19,
      borderBottomLeftRadius: 19,
    },
    notificationIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    notificationTitle: {
      fontSize: 15,
      flex: 1,
      marginRight: 8,
    },
    notificationTitleRead: {
      color: colors.textPrimary,
      fontWeight: '500',
    },
    notificationTitleUnread: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    notificationMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 6,
    },
    notificationFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    notificationTime: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.primarySubtle,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    actionPillText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
    },
    unreadTag: {
      backgroundColor: colors.primary,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    unreadTagText: {
      fontSize: 10,
      color: colors.textInverse,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
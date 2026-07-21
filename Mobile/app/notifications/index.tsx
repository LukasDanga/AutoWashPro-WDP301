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

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
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
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Notification, NotificationType } from '../../src/types';

type NotificationVisual = {
  icon: string;
  bg: string;
  fg: string;
};

const VISUALS: Record<NotificationType, NotificationVisual> = {
  booking_created: { icon: Icons.calendarOutline, bg: 'primarySubtle', fg: 'primary' },
  booking_confirmed: { icon: Icons.checkmark, bg: 'successLight', fg: 'success' },
  booking_cancelled: { icon: Icons.closeCircleOutline || 'close-circle-outline', bg: 'errorLight', fg: 'error' },
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
  system: { icon: Icons.informationCircleOutline || 'information-circle-outline', bg: 'surfaceDark', fg: 'textSecondary' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = createStyles(colors);
  const { isAuthenticated } = useAuth();
  const { markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } =
    useNotifications();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationApi.getNotifications({ limit: 50 });
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) fetchNotifications();
    }, [isAuthenticated, fetchNotifications]),
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

  const handleDelete = (notification: Notification) => {
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
        }
      },
      undefined,
      'Xóa',
      'Hủy',
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    await handleMarkAsRead(notification);
    const data = notification.data || {};
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ScreenContainer background="subtle">
      <Header
        showBack
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : undefined}
        rightAction={
          unreadCount > 0 ? (
            <PressableScale
              onPress={handleMarkAllRead}
              disabled={isMarkingAllRead}
              style={styles.markAllButton}
              accessibilityLabel="Đánh dấu tất cả đã đọc"
            >
              <AppText
                variant="bodySmall"
                style={[
                  styles.markAllText,
                  isMarkingAllRead && { color: colors.textTertiary },
                ]}
              >
                {isMarkingAllRead ? 'Đang xử lý…' : 'Đã đọc tất cả'}
              </AppText>
            </PressableScale>
          ) : null
        }
      />

      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            colors={colors}
            styles={styles}
            onPress={() => handleNotificationPress(item)}
            onLongPress={() => handleDelete(item)}
            formatTime={formatTime}
          />
        )}
        keyExtractor={(item) => item._id}
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
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ListEmptyComponent={
          <EmptyState
            iconName={Icons.notificationsOutline}
            title="Không có thông báo"
            message="Bạn chưa có thông báo nào"
          />
        }
      />
    </ScreenContainer>
  );
}

interface NotificationCardProps {
  notification: Notification;
  colors: any;
  styles: any;
  onPress: () => void;
  onLongPress: () => void;
  formatTime: (s: string) => string;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  colors,
  styles,
  onPress,
  onLongPress,
  formatTime,
}) => {
  const visual = VISUALS[notification.type] || {
    icon: Icons.notificationsOutline,
    bg: 'primarySubtle',
    fg: 'primary',
  };
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      accessibilityHint={
        notification.isRead ? 'Đã đọc, nhấn để xem chi tiết' : 'Chưa đọc, nhấn để xem chi tiết'
      }
    >
      <View
        style={[
          styles.notificationCard,
          !notification.isRead && {
            backgroundColor: colors.primarySubtle,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          },
        ]}
      >
        <View style={[styles.notificationIcon, { backgroundColor: (colors as any)[visual.bg] }]}>
          <Icon name={visual.icon} size={22} color={(colors as any)[visual.fg]} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                notification.isRead
                  ? styles.notificationTitleRead
                  : styles.notificationTitleUnread,
              ]}
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            {!notification.isRead ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          <View style={styles.notificationFooter}>
            <Icon name={Icons.timeOutline} size={11} color={colors.textTertiary} />
            <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

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
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    skeletonList: {
      padding: spacing.md,
    },
    skeletonCard: {
      backgroundColor: colors.surface,
      marginBottom: spacing.xs,
      borderRadius: borderRadius.lg,
    },
    notificationCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    notificationIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 4,
      gap: spacing.xs,
    },
    notificationTitle: {
      fontSize: 14,
      flex: 1,
    },
    notificationTitleRead: {
      color: colors.textPrimary,
      fontWeight: '500',
    },
    notificationTitleUnread: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 6,
    },
    notificationMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: 18,
    },
    notificationFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    notificationTime: {
      fontSize: 12,
      color: colors.textTertiary,
    },
  });
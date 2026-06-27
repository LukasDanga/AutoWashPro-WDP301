/**
 * AutoWashPro Notification Detail Screen
 * Shows full notification content
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading,
  EmptyState,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Notification, NotificationType } from '../../src/types';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  booking_created: '📅',
  booking_confirmed: '✅',
  booking_reminder: '⏰',
  booking_completed: '🎉',
  payment_success: '💰',
  voucher_expiring: '🎟️',
  points_earned: '⭐',
  promotion: '🏷️',
};

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchNotification();
    }
  }, [id]);

  const fetchNotification = async () => {
    try {
      setIsLoading(true);
      // Note: In a real app, you'd have a getNotificationById endpoint
      // For now, we'll use getNotifications with a filter
      const response = await notificationApi.getNotifications({ limit: 100 });
      const found = (response.notifications || []).find(n => n._id === id);
      setNotification(found || null);
    } catch (error) {
      console.error('Error fetching notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification || notification.isRead) return;
    
    try {
      await notificationApi.markAsRead(notification._id);
      setNotification({ ...notification, isRead: true });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa thông báo',
      'Bạn có chắc chắn muốn xóa thông báo này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationApi.deleteNotification(notification!._id);
              router.back();
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!notification) return;
    
    try {
      await Share.share({
        message: `${notification.title}\n\n${notification.message}`,
        title: notification.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAction = () => {
    if (!notification) return;
    
    if (notification.data?.bookingId) {
      router.push(`/booking/${notification.data.bookingId}`);
    } else if (notification.data?.voucherId) {
      router.push(`/voucher/${notification.data.voucherId}`);
    } else if (notification.data?.url) {
      router.push(notification.data.url);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: NotificationType) => {
    const labels: Record<NotificationType, string> = {
      booking_created: 'Đặt lịch mới',
      booking_confirmed: 'Xác nhận đặt lịch',
      booking_reminder: 'Nhắc nhở đặt lịch',
      booking_completed: 'Hoàn thành dịch vụ',
      payment_success: 'Thanh toán thành công',
      voucher_expiring: 'Voucher sắp hết hạn',
      points_earned: 'Tích điểm',
      promotion: 'Khuyến mãi',
    };
    return labels[type] || 'Thông báo';
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Chi tiết</AppText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>❌</Text>}
          title="Không tìm thấy"
          message="Thông báo không tồn tại hoặc đã bị xóa"
        />
      </SafeAreaView>
    );
  }

  // Mark as read when opening
  useEffect(() => {
    handleMarkAsRead();
  }, []);

  const hasAction = notification.data?.bookingId || 
                    notification.data?.voucherId || 
                    notification.data?.url;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Chi tiết</AppText>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Text style={styles.headerIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Text style={styles.headerIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Header */}
        <View style={[
          styles.iconContainer,
          !notification.isRead && styles.iconContainerUnread,
        ]}>
          <Text style={styles.iconEmoji}>
            {NOTIFICATION_ICONS[notification.type] || '📢'}
          </Text>
        </View>

        <AppText variant="h3" style={styles.title}>
          {notification.title}
        </AppText>

        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{getTypeLabel(notification.type)}</Text>
          </View>
          {!notification.isRead && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>Mới</Text>
            </View>
          )}
        </View>

        <Text style={styles.timestamp}>
          {formatDate(notification.createdAt)}
        </Text>

        {/* Notification Content */}
        <Card style={styles.contentCard}>
          <AppText variant="body" style={styles.message}>
            {notification.message}
          </AppText>
        </Card>

        {/* Additional Data */}
        {notification.data && Object.keys(notification.data).length > 0 && (
          <Card style={styles.dataCard}>
            <AppText variant="h4" style={styles.sectionTitle}>
              Thông tin chi tiết
            </AppText>
            
            {notification.data.bookingId && (
              <View style={styles.dataRow}>
                <Text style={styles.dataIcon}>📋</Text>
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Mã đặt lịch</Text>
                  <Text style={styles.dataValue}>
                    #{String(notification.data.bookingId).slice(-8).toUpperCase()}
                  </Text>
                </View>
              </View>
            )}

            {notification.data.branchName && (
              <View style={styles.dataRow}>
                <Text style={styles.dataIcon}>📍</Text>
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Chi nhánh</Text>
                  <Text style={styles.dataValue}>{notification.data.branchName}</Text>
                </View>
              </View>
            )}

            {notification.data.amount && (
              <View style={styles.dataRow}>
                <Text style={styles.dataIcon}>💰</Text>
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Số tiền</Text>
                  <Text style={styles.dataValue}>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      minimumFractionDigits: 0,
                    }).format(notification.data.amount)}
                  </Text>
                </View>
              </View>
            )}

            {notification.data.points && (
              <View style={styles.dataRow}>
                <Text style={styles.dataIcon}>⭐</Text>
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Điểm tích lũy</Text>
                  <Text style={styles.dataValue}>+{notification.data.points} điểm</Text>
                </View>
              </View>
            )}

            {notification.data.voucherCode && (
              <View style={styles.dataRow}>
                <Text style={styles.dataIcon}>🎟️</Text>
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Mã voucher</Text>
                  <Text style={styles.dataValue}>{notification.data.voucherCode}</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Quick Actions */}
        {hasAction && (
          <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
            <Text style={styles.actionIcon}>➡️</Text>
            <Text style={styles.actionText}>
              {notification.data?.bookingId ? 'Xem chi tiết đặt lịch' : 
               notification.data?.voucherId ? 'Xem voucher' : 
               'Xem chi tiết'}
            </Text>
          </TouchableOpacity>
        )}
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  iconContainerUnread: {
    backgroundColor: colors.primary,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  unreadText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 10,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  contentCard: {
    marginBottom: spacing.md,
  },
  message: {
    lineHeight: 24,
    color: colors.textPrimary,
  },
  dataCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dataIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 24,
  },
  dataContent: {
    flex: 1,
  },
  dataLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dataValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
});

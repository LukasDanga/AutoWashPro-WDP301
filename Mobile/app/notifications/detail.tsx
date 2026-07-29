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
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { notificationApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  EmptyState,
  Icon,
  Icons,
  Header,
  ScreenContainer,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import type { Notification, NotificationType } from '../../src/types';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  booking_created: Icons.calendarOutline,
  booking_confirmed: 'checkmark-circle-outline',
  booking_cancelled: 'close-circle-outline',
  booking_cancelled_system: 'close-circle-outline',
  booking_completed: 'sparkles-outline',
  booking_reminder: Icons.timeOutline,
  booking_at_risk: 'warning-outline',
  booking_grace_extended: 'hourglass-outline',
  payment_received: Icons.walletOutline,
  payment_confirmed: 'checkmark-done-circle-outline',
  payment_success: Icons.walletOutline,
  refund: 'cash-outline',
  voucher: 'pricetag-outline',
  voucher_expiring: 'pricetag-outline',
  points_earned: Icons.star,
  promotion: 'sparkles-outline',
  profile_updated: 'person-outline',
  vehicle_added: 'car-outline',
  wallet_transaction: Icons.walletOutline,
  system: 'information-circle-outline',
};

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const toast = useToast();

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
    AlertDialog.confirm(
      'Xóa thông báo',
      'Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.',
      async () => {
        try {
          await notificationApi.deleteNotification(notification!._id);
          toast.success('Đã xóa', 'Thông báo đã được xóa');
          setTimeout(() => router.back(), 400);
        } catch (error: any) {
          AlertDialog.error('Lỗi', error.response?.data?.message || 'Không thể xóa');
        }
      },
      undefined,
      'Xóa',
      'Hủy',
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
      booking_cancelled: 'Đã hủy đặt lịch',
      booking_cancelled_system: 'Hệ thống hủy lịch',
      booking_completed: 'Hoàn thành dịch vụ',
      booking_reminder: 'Nhắc nhở đặt lịch',
      booking_at_risk: 'Nguy cơ hủy lịch',
      booking_grace_extended: 'Gia hạn thời gian',
      payment_received: 'Đã nhận thanh toán',
      payment_confirmed: 'Xác nhận thanh toán',
      payment_success: 'Thanh toán thành công',
      refund: 'Hoàn tiền',
      voucher: 'Voucher mới',
      voucher_expiring: 'Voucher sắp hết hạn',
      points_earned: 'Tích điểm',
      promotion: 'Khuyến mãi',
      profile_updated: 'Cập nhật tài khoản',
      vehicle_added: 'Thêm phương tiện',
      wallet_transaction: 'Giao dịch ví',
      system: 'Hệ thống',
    };
    return labels[type] || 'Thông báo';
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  if (!notification) {
    return (
      <ScreenContainer>
        <Header showBack title="Chi tiết" />
        <EmptyState
          icon={<Icon name={'close-circle-outline'} size={48} color={colors.textTertiary} />}
          title="Không tìm thấy"
          message="Thông báo không tồn tại hoặc đã bị xóa"
        />
      </ScreenContainer>
    );
  }

  // Mark as read when opening
  useEffect(() => {
    handleMarkAsRead();
  }, []);

  const hasAction = notification.data?.bookingId || 
                    notification.data?.voucherId || 
                    notification.data?.url;
  const iconName = NOTIFICATION_ICONS[notification.type] || Icons.notificationsOutline;

  return (
    <ScreenContainer>
      <Header 
        showBack 
        title="Chi tiết" 
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Icon name={'share-outline'} size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Icon name={Icons.trashOutline} size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        }
      />

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
          <Icon name={iconName} size={40} color={colors.textInverse} />
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
                <Icon name={Icons.listOutline} size={20} color={colors.textSecondary} style={styles.dataIcon} />
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
                <Icon name={Icons.locationOutline} size={20} color={colors.textSecondary} style={styles.dataIcon} />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Chi nhánh</Text>
                  <Text style={styles.dataValue}>{notification.data.branchName}</Text>
                </View>
              </View>
            )}

            {notification.data.amount && (
              <View style={styles.dataRow}>
                <Icon name={Icons.walletOutline} size={20} color={colors.textSecondary} style={styles.dataIcon} />
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
                <Icon name={Icons.star} size={20} color={colors.textSecondary} style={styles.dataIcon} />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Điểm tích lũy</Text>
                  <Text style={styles.dataValue}>+{notification.data.points} điểm</Text>
                </View>
              </View>
            )}

            {notification.data.voucherCode && (
              <View style={styles.dataRow}>
                <Icon name={'pricetag-outline'} size={20} color={colors.textSecondary} style={styles.dataIcon} />
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
            <Icon name={Icons.arrowForward} size={18} color={colors.textInverse} />
            <Text style={styles.actionText}>
              {notification.data?.bookingId ? 'Xem chi tiết đặt lịch' : 
               notification.data?.voucherId ? 'Xem voucher' : 
               'Xem chi tiết'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0286c8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconContainerUnread: {
    backgroundColor: '#0286c8',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  typeText: {
    fontSize: 12,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#0286c8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  unreadText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#9e9e9e',
    textAlign: 'center',
    marginBottom: 20,
  },
  contentCard: {
    marginBottom: 16,
  },
  message: {
    lineHeight: 24,
    color: '#333',
  },
  dataCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataIcon: {
    marginRight: 12,
    width: 24,
  },
  dataContent: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0286c8',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

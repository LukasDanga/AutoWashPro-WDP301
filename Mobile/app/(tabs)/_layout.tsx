/**
 * AutoWashPro Tab Navigation Layout
 * Floating bottom tab bar with gradient + safe area handling
 * Following UX guidelines:
 *   - bottom-nav-limit (5 max), nav-label-icon
 *   - touch-target-size >= 44pt
 *   - safe-area compliance (notch + gesture bar)
 *   - haptic-feedback on tab press
 *   - active state clearly indicated
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { Icon, Icons } from '../../src/components/common/Icon';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  // Fire haptic on every tab press
  const handleTabPress = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // haptics not available
    }
  };

  return (
    <Tabs
      screenListeners={{
        tabPress: handleTabPress,
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.home : Icons.homeOutline}
              size={focused ? 26 : 24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: 'Trang chủ',
          tabBarLabel: 'Trang chủ',
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Đặt lịch',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.calendar : Icons.calendarOutline}
              size={focused ? 26 : 24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: 'Đặt lịch rửa xe',
          tabBarLabel: 'Đặt lịch',
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'QR Check-in',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.qrCode : Icons.qrCodeOutline}
              size={focused ? 26 : 24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: 'QR Check-in',
          tabBarLabel: 'Check-in',
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Ưu đãi',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.gift : Icons.giftOutline}
              size={focused ? 26 : 24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: 'Ưu đãi và voucher',
          tabBarLabel: 'Ưu đãi',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.person : Icons.personOutline}
              size={focused ? 26 : 24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: 'Tài khoản cá nhân',
          tabBarLabel: 'Tài khoản',
        }}
      />
      {/* History screen kept accessible via deep-link but hidden from tab bar */}
      <Tabs.Screen
        name="history"
        options={{
          href: null,
          title: 'Lịch sử',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 0,
    paddingTop: 8,
    elevation: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Subtle top border via shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
      },
      default: {},
    }),
  },
  tabBarLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: 2,
    fontSize: 11,
  },
  tabBarItem: {
    // Touch target handled by Tabs (>=48dp)
    paddingHorizontal: 4,
  },
});

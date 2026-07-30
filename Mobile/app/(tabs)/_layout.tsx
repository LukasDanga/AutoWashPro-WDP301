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
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
            height: 68 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
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
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.home : Icons.homeOutline}
              size={24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.calendar : Icons.calendarOutline}
              size={24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: t('tabs.calendar'),
          tabBarLabel: t('tabs.calendar'),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'QR Check-in',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.qrCode : Icons.qrCodeOutline}
              size={24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: t('tabs.checkin_accessibility'),
          tabBarLabel: t('tabs.checkin'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.list : Icons.listOutline}
              size={24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: t('tabs.history'),
          tabBarLabel: t('tabs.history'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? Icons.person : Icons.personOutline}
              size={24}
              color={color as string}
            />
          ),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarLabel: t('tabs.profile'),
        }}
      />
      {/* Rewards screen kept accessible via deep-link but hidden from tab bar */}
      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
          title: 'Ưu đãi',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    paddingTop: 12,
    elevation: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Subtle top border via shadow
    ...Platform.select({
      ios: {
        shadowColor: '#0050cb',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
        elevation: 8,
      },
      default: {},
    }),
  },
  tabBarLabel: {
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 4,
    fontSize: 11,
  },
  tabBarItem: {
    // Touch target handled by Tabs (>=48dp)
    paddingHorizontal: 4,
  },
});

/**
 * AutoWashPro Bottom Navigation Bar
 * Shared component for screens outside (tabs) that need the tab bar.
 * Mirrors the tab bar from (tabs)/_layout.tsx.
 */
import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Icon, Icons } from './Icon';
import { Text } from './Text';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface TabItem {
  label: string;
  icon: string;
  iconFocused: string;
  route: string;
}

const TABS: TabItem[] = [
  { label: 'Trang chủ', icon: Icons.homeOutline, iconFocused: Icons.home, route: '/(tabs)' },
  { label: 'Đặt lịch', icon: Icons.calendarOutline, iconFocused: Icons.calendar, route: '/(tabs)/booking' },
  { label: 'Check-in', icon: Icons.qrCodeOutline, iconFocused: Icons.qrCode, route: '/(tabs)/checkin' },
  { label: 'Ưu đãi', icon: Icons.giftOutline, iconFocused: Icons.gift, route: '/(tabs)/rewards' },
  { label: 'Tài khoản', icon: Icons.personOutline, iconFocused: Icons.person, route: '/(tabs)/profile' },
];

export function BottomNavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => {
    if (route === '/(tabs)') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    return pathname.startsWith(route);
  };

  return (
    <View
      style={[
        styles.tabBar,
        {
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.route);
        const color = active ? colors.primary : colors.textSecondary;
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tabItem}
            onPress={() => router.replace(tab.route as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <Icon name={active ? tab.iconFocused : tab.icon} size={24} color={color} />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
      },
      android: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
      },
      default: {},
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: 4,
    fontSize: 12,
  },
});

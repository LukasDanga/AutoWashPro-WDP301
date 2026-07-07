/**
 * AutoWashPro Skeleton Component
 * Loading placeholder with shimmer animation
 * Following UX guidelines: skeleton screens for >1s operations, use duration.shimmer token
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { duration } from '../../theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = 8,
  style,
}) => {
  const colors = useColors();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: duration.shimmer,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: duration.shimmer,
          useNativeDriver: true,
        }),
      ])
    );

    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacityVal = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surfaceDark,
          width: width as any,
          height,
          borderRadius: radius,
          opacity: opacityVal,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton layouts for common patterns
interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => {
  const colors = useColors();
  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surfaceElevated }]}>
      <Skeleton width={56} height={56} borderRadius={28} style={styles.avatar} />
      <View style={styles.textContainer}>
        <Skeleton width="70%" height={16} style={styles.line} />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} width={`${90 - i * 15}%`} height={14} style={styles.line} />
        ))}
      </View>
    </View>
  );
};

export const SkeletonListItem: React.FC = () => {
  const colors = useColors();
  return (
    <View style={[styles.listItemContainer, { backgroundColor: colors.surfaceElevated }]}>
      <Skeleton width={48} height={48} borderRadius={24} style={styles.listItemIcon} />
      <View style={styles.listItemTextContainer}>
        <Skeleton width="60%" height={16} style={styles.listItemLine} />
        <Skeleton width="40%" height={14} style={styles.listItemLine} />
      </View>
    </View>
  );
};

export const SkeletonPackageCard: React.FC = () => {
  const colors = useColors();
  return (
    <View style={[styles.packageCard, { backgroundColor: colors.surfaceElevated }]}>
      <Skeleton width="100%" height={80} borderRadius={12} style={styles.packageImage} />
      <View style={styles.packageInfo}>
        <Skeleton width="80%" height={16} style={styles.packageLine} />
        <Skeleton width="50%" height={14} style={styles.packageLine} />
        <Skeleton width="40%" height={18} style={styles.packageLine} />
      </View>
    </View>
  );
};

export const SkeletonBookingCard: React.FC = () => {
  const colors = useColors();
  return (
    <View style={[styles.bookingCardContainer, { backgroundColor: colors.surfaceElevated }]}>
      <Skeleton width={64} height={80} borderRadius={12} style={styles.bookingDate} />
      <View style={styles.bookingContent}>
        <Skeleton width="80%" height={16} style={styles.bookingLine} />
        <Skeleton width="60%" height={14} style={styles.bookingLine} />
        <Skeleton width="70%" height={14} style={styles.bookingLine} />
        <Skeleton width="40%" height={18} style={styles.bookingLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  avatar: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  line: {
    marginBottom: 8,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listItemIcon: {
    marginRight: 16,
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemLine: {
    marginBottom: 8,
  },
  packageCard: {
    width: 140,
    borderRadius: 16,
    overflow: 'hidden',
  },
  packageImage: {
    marginBottom: 8,
  },
  packageInfo: {
    padding: 8,
  },
  packageLine: {
    marginBottom: 4,
  },
  bookingCardContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  bookingDate: {
    marginRight: 16,
  },
  bookingContent: {
    flex: 1,
  },
  bookingLine: {
    marginBottom: 8,
  },
});

export default Skeleton;
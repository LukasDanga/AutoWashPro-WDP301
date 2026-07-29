/**
 * AutoWashPro BottomSheet Component
 * Modal sheet for actions, filters, date pickers, notification details.
 *
 * Following UX guidelines: modal-motion (slide-from-bottom), back-stack,
 *   swipe-down to dismiss, escape-routes, scrim opacity.
 *
 * Layout strategy (auto-sizing):
 *   - Sheet height = sum of fixed parts (handle + header + footer)
 *     + measured ScrollView content height, all clamped to sheetMaxHeight.
 *   - When content is short, the sheet is short (no empty whitespace below).
 *   - When content is tall, the sheet grows up to sheetMaxHeight and the
 *     ScrollView starts scrolling.
 */

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  Pressable,
  StyleProp,
  ViewStyle,
  Platform,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { duration, opacity as opacityToken } from '../../theme/tokens';
import { Icon, Icons } from './Icon';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /**
   * Optional footer rendered below the scrollable content area.
   * Use this to pin primary action buttons so they remain visible
   * even when the body content is long.
   */
  footer?: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  closeOnSwipeDown?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

const MIN_SHEET_HEIGHT = 120;

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  snapPoints = [0.5],
  initialSnap = 0,
  showHandle = true,
  showCloseButton = true,
  closeOnBackdropPress = true,
  closeOnSwipeDown = true,
  contentStyle,
}) => {
  const colors = useColors();
  const screenHeight = Dimensions.get('window').height;
  const sheetMaxHeight = snapPoints[Math.min(initialSnap, snapPoints.length - 1)] * screenHeight;

  const translateY = useRef(new Animated.Value(sheetMaxHeight)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);
  // Trong lúc sheet đang mở animation (slide-up), giữ height ở
  // sheetMaxHeight để chuyển động mượt. Sau khi mở xong, cho phép
  // auto-size co lại theo content thực tế.
  const [isOpening, setIsOpening] = useState(visible);

  // Chiều cao các phần cố định, đo qua onLayout.
  const [handleHeight, setHandleHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  // Chiều cao nội dung trong ScrollView (do onContentSizeChange đo).
  const [contentHeight, setContentHeight] = useState(0);

  // Reset measurements mỗi lần sheet mở để tránh giữ giá trị cũ.
  useEffect(() => {
    if (visible) {
      setContentHeight(0);
      setIsOpening(true);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsOpening(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration.medium,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: duration.medium,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Sau khi animation mở hoàn tất, cho phép auto-size.
        setIsOpening(false);
      });
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetMaxHeight,
          duration: duration.normal,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: duration.normal,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible, shouldRender, translateY, backdropAnim, sheetMaxHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        closeOnSwipeDown && Math.abs(gesture.dy) > 8 && Math.abs(gesture.dx) < 50,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          dragY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > sheetMaxHeight / 3 || gesture.vy > 1.2) {
          onClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 30,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  // Chiều cao tối đa cho ScrollView — phần còn lại sau khi trừ
  // handle + header + footer ra khỏi sheetMaxHeight.
  const fixedHeight = handleHeight + headerHeight + footerHeight;
  const scrollMaxHeight = Math.max(0, sheetMaxHeight - fixedHeight);

  // Height thực tế của ScrollView:
  // - Bằng contentHeight nếu content vừa (sheet co lại bằng content)
  // - Bằng scrollMaxHeight nếu content vượt (cuộn bên trong)
  const scrollHeight =
    contentHeight > 0
      ? Math.min(contentHeight, scrollMaxHeight)
      : scrollMaxHeight;

  // Height thực tế của toàn sheet = fixed + scrollHeight.
  // Trong lúc đang mở animation, giữ ở sheetMaxHeight để chuyển
  // động mượt; sau khi mở xong sẽ tự co theo content (đã đo).
  // Luôn clamp trong khoảng MIN_SHEET_HEIGHT và sheetMaxHeight.
  const sheetHeight = isOpening
    ? sheetMaxHeight
    : (contentHeight > 0 || fixedHeight > 0
        ? Math.max(MIN_SHEET_HEIGHT, Math.min(sheetMaxHeight, fixedHeight + scrollHeight))
        : sheetMaxHeight);

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.overlay,
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, opacityToken.scrim],
              }),
            },
          ]}
        >
          <Pressable
            style={styles.backdropPressable}
            onPress={closeOnBackdropPress ? onClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceElevated,
                height: sheetHeight,
                transform: [{ translateY: Animated.add(translateY, dragY) }],
                shadowColor: colors.textPrimary,
              },
              contentStyle,
            ]}
            {...panResponder.panHandlers}
          >
            {showHandle ? (
              <View
                style={styles.handleArea}
                onLayout={(e) => setHandleHeight(e.nativeEvent.layout.height)}
              >
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
            ) : null}

            {(title || showCloseButton) ? (
              <View
                style={styles.header}
                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
              >
                <View style={styles.headerText}>
                  {title ? (
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                      {title}
                    </Text>
                  ) : null}
                  {subtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                {showCloseButton ? (
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Đóng"
                    style={[styles.closeButton, { backgroundColor: colors.surface }]}
                  >
                    <Icon name={Icons.close} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <ScrollView
              style={[styles.content, { maxHeight: scrollHeight }]}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={(_w, h) => {
                if (Math.abs(h - contentHeight) > 0.5) setContentHeight(h);
              }}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={styles.footerWrap}
                onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
              >
                <View
                  style={[
                    styles.footerDivider,
                    { backgroundColor: colors.borderLight || '#F1F5F9' },
                  ]}
                />
                {footer}
                <SafeAreaView edges={['bottom']} />
              </View>
            ) : (
              <SafeAreaView edges={['bottom']} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  kbWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  handleArea: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    // maxHeight được set inline dựa trên contentSize để sheet tự
    // co theo nội dung, không có khoảng trắng thừa.
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  footerWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -spacing.screenPadding,
    marginBottom: spacing.sm,
  },
});

export default BottomSheet;
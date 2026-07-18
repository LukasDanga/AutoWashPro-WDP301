/**
 * AutoWashPro Chatbot Screen — Polished Refactor
 * UX comparable to ChatGPT Mobile / Gemini / Messenger
 * Preserves AutoWashPro blue-and-white branding
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { ChatProvider, useChat } from '../../src/contexts/ChatContext';
import { Icon, Icons, PressableScale } from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { ChatMessage } from '../../src/api/chatbot';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AUTO_WELCOME =
  'Xin chào! Tôi là trợ lý AI của AutoWashPro. Tôi có thể giúp bạn:\n• Tư vấn dịch vụ rửa xe\n• Kiểm tra khung giờ còn trống\n• Đặt lịch rửa xe ngay\n\nBạn cần hỗ trợ gì hôm nay?';

const SUGGESTIONS = [
  { icon: Icons.locationOutline, text: 'Chi nhánh gần nhất' },
  { icon: Icons.sparkle, text: 'Dịch vụ rửa xe' },
  { icon: Icons.calendarOutline, text: 'Đặt lịch hôm nay' },
  { icon: Icons.voucherOutline, text: 'Voucher giảm giá' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LoadingDots
// ─────────────────────────────────────────────────────────────────────────────

const LoadingDots: React.FC = () => {
  const colors = useColors();
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 380, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.loadingDots}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: colors.primary },
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [
                { scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage; isLoading?: boolean }> = ({
  message,
  isLoading,
}) => {
  const colors = useColors();
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 12 : -12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        isUser ? styles.bubbleUserWrapper : styles.bubbleModelWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Bot avatar */}
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Icon name={Icons.chatBot} size={16} color={colors.textInverse} />
          </View>
        </View>
      )}

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleModel, { backgroundColor: '#FFFFFF' }],
        ]}
      >
        {isLoading ? (
          <LoadingDots />
        ) : (
          <Text
            style={[
              styles.bubbleText,
              isUser ? { color: '#FFFFFF' } : { color: '#1a1a2e' },
            ]}
            selectable
          >
            {message.text}
          </Text>
        )}
      </View>

      {/* User avatar */}
      {isUser && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.avatarUser, { backgroundColor: colors.accent ?? colors.primary }]}>
            <Icon name={Icons.person} size={14} color={colors.textInverse} />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SuggestionChips
// ─────────────────────────────────────────────────────────────────────────────

const SuggestionChips: React.FC<{
  onSelect: (text: string) => void;
  visible: boolean;
}> = ({ onSelect, visible }) => {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.suggestionsContainer, { opacity: fadeAnim }]}>
      <Text style={[styles.suggestionsLabel, { color: colors.textSecondary }]}>
        Gợi ý nhanh
      </Text>
      <View style={styles.suggestionsRow}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.text}
            style={[
              styles.chip,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onSelect(s.text)}
            activeOpacity={0.7}
          >
            <Icon name={s.icon} size={15} color={colors.primary} />
            <Text style={[styles.chipText, { color: colors.textPrimary }]}>
              {s.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ChatContent (main screen)
// ─────────────────────────────────────────────────────────────────────────────

function ChatContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { messages, isLoading, error, sendMessage, addBotMessage, clearChat } = useChat();

  const [inputText, setInputText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const hasText = inputText.trim().length > 0;

  // Send-button animated transition
  const sendBtnScale = useRef(new Animated.Value(1)).current;
  const micToSendAnim = useRef(new Animated.Value(0)).current;

  // Init welcome message
  useEffect(() => {
    if (messages.length > 0) return;
    addBotMessage(AUTO_WELCOME);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animate mic → send transition
  useEffect(() => {
    Animated.timing(micToSendAnim, {
      toValue: hasText ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [hasText]);

  const handleSend = useCallback(async () => {
    if (!hasText || isLoading) return;
    const text = inputText.trim();
    setInputText('');

    // Scale feedback
    Animated.sequence([
      Animated.timing(sendBtnScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(sendBtnScale, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }),
    ]).start();

    await sendMessage(text);
  }, [inputText, isLoading, hasText]);

  const handleSuggestion = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const showChips = useMemo(
    () => !isLoading && messages.length <= 3 && !keyboardVisible,
    [isLoading, messages.length, keyboardVisible]
  );

  const headerHeight = 64;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.primary,
            paddingTop: insets.top,
            minHeight: headerHeight + insets.top,
          },
        ]}
      >
        <View style={styles.headerInner}>
          {/* Back button */}
          <PressableScale
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            accessibilityLabel="Quay lại"
          >
            <Icon name={Icons.back} size={20} color="#FFFFFF" />
          </PressableScale>

          {/* Center: avatar + title/subtitle */}
          <View style={styles.headerCenter}>
            <View style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Icon name={Icons.chatBot} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                AutoWashPro Assistant
              </Text>
              <Text style={styles.headerSubtitle}>
                {isLoading ? 'Đang trả lời...' : 'Online • Gemini AI'}
              </Text>
            </View>
          </View>

          {/* Clear chat button */}
          <PressableScale
            style={styles.headerIconBtn}
            onPress={clearChat}
            accessibilityLabel="Xóa lịch sử chat"
          >
            <Icon name={Icons.trashOutline} size={18} color="#FFFFFF" />
          </PressableScale>
        </View>
      </View>

      {/* ── Login banner (unauthenticated) ── */}
      {!isAuthenticated && (
        <PressableScale
          style={[
            styles.loginBanner,
            {
              backgroundColor: colors.warningLight,
              borderBottomColor: colors.warning,
            },
          ]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Icon name={Icons.lockOutline} size={14} color={colors.warning} />
          <Text style={[styles.loginBannerText, { color: colors.warning }]}>
            Đăng nhập để đặt lịch qua chatbot ngay!
          </Text>
        </PressableScale>
      )}

      {/* ── Chat area + Input (keyboard-aware) ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.primarySubtle ?? colors.surface },
                ]}
              >
                <Icon name={Icons.chatBot} size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Chat với AutoWashPro
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tôi có thể giúp bạn đặt lịch rửa xe, tư vấn dịch vụ và hơn thế nữa
              </Text>
            </View>
          }
        />

        {/* Error toast */}
        {error && (
          <View
            style={[
              styles.errorToast,
              {
                backgroundColor: colors.errorLight,
                borderLeftColor: colors.error,
              },
            ]}
          >
            <Icon name={Icons.warning} size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Suggestion chips */}
        <SuggestionChips onSelect={handleSuggestion} visible={showChips} />

        {/* ── Input bar ── */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            },
            shadows.sm,
          ]}
        >
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: '#F2F4F7',
                borderColor: inputFocused ? colors.primary : colors.border,
              },
            ]}
          >
            {/* Attachment / expand icon */}
            <TouchableOpacity
              style={styles.inputSideBtn}
              activeOpacity={0.7}
              accessibilityLabel="Thêm tệp đính kèm"
            >
            <Icon name={Icons.addCircleOutline} size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.textPrimary }]}
              placeholder="Nhắn tin cho AutoWashPro..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              blurOnSubmit={false}
              textAlignVertical="center"
            />

            {/* Mic or Send button */}
            <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
              {hasText && (
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSend}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  accessibilityLabel="Gửi tin nhắn"
                >
                  <Icon
                    name={Icons.forward}
                    size={18}
                    color="#FFFFFF"
                    style={{ transform: [{ rotate: '-90deg' }] }}
                  />
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  headerInner: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitles: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
    marginTop: 2,
  },

  // ── Login Banner ─────────────────────────────────────────────────────────────
  loginBanner: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Message List ─────────────────────────────────────────────────────────────
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // ── Empty State ──────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Message Bubbles ──────────────────────────────────────────────────────────
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleModelWrapper: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 34,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {},
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },

  // ── Loading Dots ─────────────────────────────────────────────────────────────
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Error Toast ──────────────────────────────────────────────────────────────
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '400',
  },

  // ── Suggestion Chips ─────────────────────────────────────────────────────────
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Input Area ───────────────────────────────────────────────────────────────
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 52,
    maxHeight: 120,
  },
  inputSideBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

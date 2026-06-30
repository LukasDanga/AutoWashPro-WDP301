/**
 * AutoWashPro Chatbot Screen
 * AI-powered booking assistant
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { ChatProvider, useChat } from '../../src/contexts/ChatContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { ChatMessage } from '../../src/api/chatbot';

const AUTO_WELCOME = 'Xin chào! Tôi là trợ lý AI của AutoWashPro. Tôi có thể giúp bạn:\n• Tư vấn dịch vụ rửa xe\n• Kiểm tra khung giờ còn trống\n• Đặt lịch rửa xe ngay\n\nBạn cần hỗ trợ gì hôm nay?';

// ─── Animated Loading Dots ───────────────────────────────────────────────────────

const LoadingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
    };
    const anim1 = animate(dot1, 0).start();
    const anim2 = animate(dot2, 200).start();
    const anim3 = animate(dot3, 400).start();
    return () => { anim1; anim2; anim3; };
  }, []);

  const makeStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={styles.loadingDots}>
      <Animated.View style={[styles.dot, styles.dotActive, makeStyle(dot1)]} />
      <Animated.View style={[styles.dot, styles.dotActive, makeStyle(dot2)]} />
      <Animated.View style={[styles.dot, styles.dotActive, makeStyle(dot3)]} />
    </View>
  );
};

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage; isLoading?: boolean }> = ({
  message,
  isLoading,
}) => {
  const isUser = message.role === 'user';
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [message.text]);

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        isUser ? styles.bubbleUserWrapper : styles.bubbleModelWrapper,
        { opacity: fadeAnim },
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleModel]}>
        {isLoading ? (
          <LoadingDots />
        ) : (
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]} selectable>
            {message.text}
          </Text>
        )}
      </View>
      {isUser && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.avatarUser]}>
            <Text style={styles.avatarText}>ME</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// ─── Chat List Item ───────────────────────────────────────────────────────────

const ChatListItem: React.FC<{ item: ChatMessage; isLoading: boolean }> = ({
  item,
  isLoading,
}) => (
  <MessageBubble message={item} isLoading={false} />
);

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  '📍 Chi nhánh gần nhất',
  '💇 Dịch vụ rửa xe',
  '📅 Đặt lịch hôm nay',
  '🎁 Voucher giảm giá',
];

// ─── Chat Content ─────────────────────────────────────────────────────────────

function ChatContent() {
  const { isAuthenticated } = useAuth();
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isLoading || messages.length > 0) return;
    sendMessage(AUTO_WELCOME);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();
    await sendMessage(text);
  }, [inputText, isLoading, sendMessage]);

  const handleSuggestion = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>AI</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Trợ lý AutoWashPro</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading ? 'Đang trả lời...' : 'Online • Gemini AI'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Text style={styles.clearIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Warning banner for unauthenticated users */}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.loginBanner}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginBannerText}>
            🔑 Đăng nhập để đặt lịch qua chatbot ngay!
          </Text>
        </TouchableOpacity>
      )}

      {/* Chat list */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <ChatListItem item={item} isLoading={isLoading} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>🤖</Text>
              </View>
              <Text style={styles.emptyTitle}>Chat với AutoWashPro</Text>
              <Text style={styles.emptySubtitle}>
                Tôi có thể giúp bạn đặt lịch rửa xe, tư vấn dịch vụ và hơn thế nữa
              </Text>
            </View>
          }
        />

        {/* Error toast */}
        {error && (
          <View style={styles.errorToast}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Suggestion chips */}
        {!isLoading && messages.length <= 3 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Gợi ý:</Text>
            <View style={styles.suggestionsRow}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => handleSuggestion(s)}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Screen Export ────────────────────────────────────────────────────────────

export default function ChatScreen() {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    ...shadows.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  backIcon: {
    fontSize: 18,
    color: colors.textInverse,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerAvatarText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textInverse,
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    fontSize: 16,
  },
  loginBanner: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
  },
  loginBannerText: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: 'center',
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleModelWrapper: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    marginHorizontal: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    backgroundColor: colors.accent,
  },
  avatarText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 10,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  bubbleModel: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: spacing.xs,
    ...shadows.sm,
  },
  bubbleText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.textInverse,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  errorToast: {
    backgroundColor: colors.errorLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  suggestionsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendIcon: {
    fontSize: 20,
    color: colors.textInverse,
    fontWeight: '700',
  },
});

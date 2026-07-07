/**
 * AutoWashPro Chatbot Screen
 * AI-powered booking assistant
 * Following UX guidelines: accessibility, no-emoji-icons, scale-feedback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { ChatProvider, useChat } from '../../src/contexts/ChatContext';
import { Icon, Icons, PressableScale } from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { ChatMessage } from '../../src/api/chatbot';

const AUTO_WELCOME = 'Xin chào! Tôi là trợ lý AI của AutoWashPro. Tôi có thể giúp bạn:\n• Tư vấn dịch vụ rửa xe\n• Kiểm tra khung giờ còn trống\n• Đặt lịch rửa xe ngay\n\nBạn cần hỗ trợ gì hôm nay?';

const LoadingDots: React.FC = () => {
  const colors = useColors();
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
      <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, makeStyle(dot1)]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, makeStyle(dot2)]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, makeStyle(dot3)]} />
    </View>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage; isLoading?: boolean }> = ({
  message,
  isLoading,
}) => {
  const colors = useColors();
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
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Icon name={Icons.chatBot} size={18} color={colors.textInverse} />
          </View>
        </View>
      )}
      <View style={[styles.bubble, isUser ? [styles.bubbleUser, { backgroundColor: colors.primary }] : [styles.bubbleModel, { backgroundColor: colors.background }]]}>
        {isLoading ? (
          <LoadingDots />
        ) : (
          <Text style={[styles.bubbleText, isUser && { color: colors.textInverse }]} selectable>
            {message.text}
          </Text>
        )}
      </View>
      {isUser && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.avatarUser, { backgroundColor: colors.accent }]}>
            <Icon name={Icons.person} size={16} color={colors.textInverse} />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const SUGGESTIONS = [
  { icon: Icons.locationOutline, text: 'Chi nhánh gần nhất' },
  { icon: Icons.sparkle, text: 'Dịch vụ rửa xe' },
  { icon: Icons.calendarOutline, text: 'Đặt lịch hôm nay' },
  { icon: Icons.voucherOutline, text: 'Voucher giảm giá' },
];

function ChatContent() {
  const colors = useColors();
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: spacing.lg }]}>
        <PressableScale
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
        >
          <Icon name={Icons.back} size={20} color={colors.textInverse} />
        </PressableScale>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Icon name={Icons.chatBot} size={20} color={colors.textInverse} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textInverse }]}>Trợ lý AutoWashPro</Text>
            <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
              {isLoading ? 'Đang trả lời...' : 'Online • Gemini AI'}
            </Text>
          </View>
        </View>
        <PressableScale
          style={styles.clearButton}
          onPress={clearChat}
          accessibilityLabel="Xóa lịch sử chat"
        >
          <Icon name={Icons.trashOutline} size={18} color={colors.textInverse} />
        </PressableScale>
      </View>

      {/* Warning banner for unauthenticated users */}
      {!isAuthenticated && (
        <PressableScale
          style={[styles.loginBanner, { backgroundColor: colors.warningLight, borderBottomColor: colors.warning }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Icon name={Icons.lockOutline} size={14} color={colors.warning} />
          <Text style={[styles.loginBannerText, { color: colors.warning }]}>
            Đăng nhập để đặt lịch qua chatbot ngay!
          </Text>
        </PressableScale>
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
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySubtle }]}>
                <Icon name={Icons.chatBot} size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Chat với AutoWashPro</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tôi có thể giúp bạn đặt lịch rửa xe, tư vấn dịch vụ và hơn thế nữa
              </Text>
            </View>
          }
        />

        {/* Error toast */}
        {error && (
          <View style={[styles.errorToast, { backgroundColor: colors.errorLight, borderLeftColor: colors.error }]}>
            <Icon name={Icons.warning} size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Suggestion chips */}
        {!isLoading && messages.length <= 3 && (
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.suggestionsLabel, { color: colors.textSecondary }]}>Gợi ý:</Text>
            <View style={styles.suggestionsRow}>
              {SUGGESTIONS.map((s) => (
                <PressableScale
                  key={s.text}
                  style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleSuggestion(s.text)}
                >
                  <Icon name={s.icon} size={14} color={colors.textSecondary} />
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>{s.text}</Text>
                </PressableScale>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.textPrimary }]}
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
            <PressableScale
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && { backgroundColor: colors.border },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              accessibilityLabel="Gửi tin nhắn"
            >
              <Icon name={Icons.forward} size={18} color={colors.textInverse} style={{ transform: [{ rotate: '-90deg' }] }} />
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ChatScreen() {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h4,
  },
  headerSubtitle: {
    ...typography.caption,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBanner: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loginBannerText: {
    ...typography.bodySmall,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {},
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  bubbleUser: {
    borderBottomRightRadius: spacing.xs,
  },
  bubbleModel: {
    borderBottomLeftRadius: spacing.xs,
    ...shadows.sm,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 22,
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
    backgroundColor: '#ccc',
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    flex: 1,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  suggestionsLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});

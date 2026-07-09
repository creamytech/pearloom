import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/lib/api';
import { colors, fonts, spacing, radius } from '@/lib/theme';

// ── Types ──────────────────────────────────────────────────────────────

interface Manifest {
  blocks?: any[];
  vibeSkin?: { palette?: string[]; fontPair?: string };
  theme?: { colors?: Record<string, string>; fonts?: Record<string, string> };
  couple?: { names?: [string, string]; date?: string; tagline?: string };
  chapters?: any[];
  events?: any[];
  faqs?: any[];
  registry?: any;
  poetry?: Record<string, string>;
  logistics?: Record<string, string>;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'pear';
  text: string;
}

interface AIChatResponse {
  action: string;
  data: any;
  reply: string;
}

interface PearChatProps {
  visible: boolean;
  onClose: () => void;
  manifest: Manifest;
  activeChapterId?: string | null;
  onManifestUpdate: (updated: Manifest) => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

const QUICK_CHIPS = [
  'Help me start',
  'Make it beautiful',
  'Write content',
  'Set up events',
  'Add FAQ',
];

// ── Typing Indicator ───────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.pearIconSmall}>
        <Text style={styles.pearIconText}>{'\uD83C\uDF50'}</Text>
      </View>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { opacity: dot }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function PearChat({
  visible,
  onClose,
  manifest,
  activeChapterId = null,
  onManifestUpdate,
}: PearChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [thinking, setThinking] = useState(false);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // ── Slide animation ──────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  // ── Clear messages on close ──────────────────────────────────

  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setMessages([]);
        setInputVal('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // ── Apply AI actions to manifest ─────────────────────────────

  const applyAction = useCallback(
    (action: string, data: any) => {
      if (!data) return;

      const updated = { ...manifest };

      switch (action) {
        case 'update_manifest': {
          if (data.path && data.value !== undefined) {
            const parts = (data.path as string).split('.');
            if (parts.length === 1) {
              (updated as any)[parts[0]] = data.value;
            } else if (parts.length === 2) {
              const [top, sub] = parts;
              (updated as any)[top] = {
                ...((updated as any)[top] ?? {}),
                [sub]: data.value,
              };
            } else if (
              parts.length === 3 &&
              parts[0] === 'chapters'
            ) {
              const idx = parseInt(parts[1], 10);
              const field = parts[2];
              if (updated.chapters && !isNaN(idx) && updated.chapters[idx]) {
                updated.chapters = [...updated.chapters];
                updated.chapters[idx] = {
                  ...updated.chapters[idx],
                  [field]: data.value,
                };
              }
            }
          }
          break;
        }

        case 'update_chapter': {
          if (data.id && updated.chapters) {
            updated.chapters = updated.chapters.map((ch: any) =>
              ch.id === data.id ? { ...ch, ...data } : ch,
            );
          }
          break;
        }

        case 'update_theme': {
          updated.theme = {
            ...updated.theme,
            ...(data.colors ? { colors: { ...updated.theme?.colors, ...data.colors } } : {}),
            ...(data.fonts ? { fonts: { ...updated.theme?.fonts, ...data.fonts } } : {}),
          };
          break;
        }

        case 'update_events': {
          if (data.events) {
            updated.events = data.events;
            // Also update any event block config
            if (updated.blocks) {
              updated.blocks = updated.blocks.map((b: any) => {
                if (b.type === 'events' || b.type === 'event') {
                  return {
                    ...b,
                    config: { ...b.config, events: data.events },
                  };
                }
                return b;
              });
            }
          }
          break;
        }

        case 'update_faqs': {
          if (data.faqs) {
            updated.faqs = data.faqs;
            // Also update any FAQ block config
            if (updated.blocks) {
              updated.blocks = updated.blocks.map((b: any) => {
                if (b.type === 'faq') {
                  return {
                    ...b,
                    config: { ...b.config, items: data.faqs },
                  };
                }
                return b;
              });
            }
          }
          break;
        }

        case 'update_blocks': {
          if (!updated.blocks) updated.blocks = [];
          if (data.add) {
            for (const block of data.add) {
              updated.blocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: block.type,
                visible: true,
                config: block.config ?? {},
              });
            }
          }
          if (data.update) {
            for (const upd of data.update) {
              updated.blocks = updated.blocks.map((b: any) =>
                b.id === upd.id ? { ...b, config: { ...b.config, ...upd.config } } : b,
              );
            }
          }
          if (data.remove) {
            const removeSet = new Set(data.remove);
            updated.blocks = updated.blocks.filter(
              (b: any) => !removeSet.has(b.id),
            );
          }
          break;
        }

        case 'update_registry': {
          updated.registry = { ...updated.registry, ...data };
          break;
        }

        default:
          // 'message' or unknown — no manifest changes
          return;
      }

      onManifestUpdate(updated);
    },
    [manifest, onManifestUpdate],
  );

  // ── Send message ─────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputVal('');
      setThinking(true);

      try {
        const res = await apiFetch<AIChatResponse>('/api/ai-chat', {
          method: 'POST',
          body: JSON.stringify({
            message: trimmed,
            manifest,
            activeChapterId,
          }),
        });

        applyAction(res.action, res.data);

        const pearMsg: ChatMessage = {
          id: `p-${Date.now()}`,
          role: 'pear',
          text: res.reply || "Done! Let me know if you'd like anything else.",
        };
        setMessages((prev) => [...prev, pearMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'pear',
            text: 'Something went wrong. Please try again in a moment.',
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [thinking, manifest, activeChapterId, applyAction],
  );

  // ── Auto-scroll ──────────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, thinking]);

  // ── Render message bubble ────────────────────────────────────

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      return (
        <View
          style={[
            styles.messageRow,
            isUser ? styles.messageRowUser : styles.messageRowPear,
          ]}
        >
          {!isUser && (
            <View style={styles.pearIconSmall}>
              <Text style={styles.pearIconText}>{'\uD83C\uDF50'}</Text>
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.pearBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.pearText,
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    },
    [],
  );

  // ── Handle close ─────────────────────────────────────────────

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Bottom sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.pearHeaderIcon}>
                <Text style={{ fontSize: 20 }}>{'\uD83C\uDF50'}</Text>
              </View>
              <Text style={styles.headerTitle}>Pear</Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>{'\u2715'}</Text>
            </Pressable>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !thinking ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>{'\uD83C\uDF50'}</Text>
                  <Text style={styles.emptyTitle}>Hey there!</Text>
                  <Text style={styles.emptyDesc}>
                    I can help you edit your site, write content, set up events,
                    and more. Just ask!
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={thinking ? <TypingIndicator /> : null}
          />

          {/* Quick chips (only when no messages) */}
          {messages.length === 0 && !thinking && (
            <View style={styles.chipsRow}>
              {QUICK_CHIPS.map((chip) => (
                <Pressable
                  key={chip}
                  style={styles.chip}
                  onPress={() => sendMessage(chip)}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={inputVal}
              onChangeText={setInputVal}
              placeholder="Ask Pear anything..."
              placeholderTextColor={colors.muted}
              editable={!thinking}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(inputVal)}
              multiline={false}
            />
            <Pressable
              style={[
                styles.sendBtn,
                (!inputVal.trim() || thinking) && styles.sendBtnDisabled,
              ]}
              onPress={() => sendMessage(inputVal)}
              disabled={!inputVal.trim() || thinking}
            >
              <Text style={styles.sendBtnText}>{'\u2191'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
    backgroundColor: colors.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pearHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.olive + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.bodySemibold,
  },

  // Messages
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowPear: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.olive,
    borderBottomRightRadius: 4,
  },
  pearBubble: {
    backgroundColor: colors.creamDeep,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(163,177,138,0.15)',
  },
  messageText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: colors.white,
  },
  pearText: {
    color: colors.inkSoft,
  },
  pearIconSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.olive + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  pearIconText: {
    fontSize: 14,
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: colors.creamDeep,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(163,177,138,0.15)',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.olive,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Quick chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.olive + '40',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.oliveDeep,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.creamDeep,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.olive + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.bodySemibold,
  },
});

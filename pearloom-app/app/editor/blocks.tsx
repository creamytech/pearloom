import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/lib/api';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import BlockRow from '@/components/BlockRow';

// ── Types ──────────────────────────────────────────────────────────────

interface Block {
  id: string;
  type: string;
  title?: string;
  name?: string;
  visible?: boolean;
  config?: any;
  data?: any;
}

// Available block types for the picker
const BLOCK_TYPES = [
  { type: 'hero', name: 'Hero', icon: '\u{1F3A8}', description: 'Cover section with names and date' },
  { type: 'story', name: 'Our Story', icon: '\u{1F4D6}', description: 'Share your love story chapters' },
  { type: 'events', name: 'Events', icon: '\u{1F4C5}', description: 'Ceremony, reception, and more' },
  { type: 'rsvp', name: 'RSVP', icon: '\u{1F48C}', description: 'Guest response collection' },
  { type: 'registry', name: 'Registry', icon: '\u{1F381}', description: 'Gift registry links' },
  { type: 'travel', name: 'Travel', icon: '\u{2708}', description: 'Hotels and accommodations' },
  { type: 'faq', name: 'FAQ', icon: '\u{2753}', description: 'Frequently asked questions' },
  { type: 'guestbook', name: 'Guestbook', icon: '\u{1F4AC}', description: 'Messages from loved ones' },
  { type: 'photos', name: 'Photos', icon: '\u{1F4F7}', description: 'Photo gallery grid' },
  { type: 'quote', name: 'Quote', icon: '\u{201C}', description: 'A meaningful quote' },
  { type: 'countdown', name: 'Countdown', icon: '\u{23F3}', description: 'Days until the big day' },
  { type: 'spotify', name: 'Spotify', icon: '\u{1F3B5}', description: 'Wedding playlist' },
  { type: 'hashtag', name: 'Hashtag', icon: '#', description: 'Your wedding hashtag' },
  { type: 'video', name: 'Video', icon: '\u{1F3AC}', description: 'Embed a video' },
  { type: 'text', name: 'Text', icon: '\u{1F4DD}', description: 'Custom text block' },
];

// ── Component ──────────────────────────────────────────────────────────

export default function BlocksScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const router = useRouter();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBtnScale = useRef(new Animated.Value(0)).current;

  // ── Fetch blocks ──────────────────────────────────────────────────────

  const fetchBlocks = useCallback(async () => {
    try {
      setError(null);
      const site = await apiFetch<any>(`/api/sites/${encodeURIComponent(siteId!)}`);
      const manifest = site.manifest ?? {};
      setBlocks(manifest.blocks ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load blocks');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  useEffect(() => {
    if (!loading) {
      Animated.spring(addBtnScale, {
        toValue: 1,
        damping: 14,
        stiffness: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  // ── Save blocks to API ────────────────────────────────────────────────

  const saveBlocks = useCallback(
    async (updatedBlocks: Block[]) => {
      setSaving(true);
      try {
        await apiFetch(`/api/sites/${encodeURIComponent(siteId!)}/manifest`, {
          method: 'PATCH',
          body: JSON.stringify({ blocks: updatedBlocks }),
        });
      } catch (err: any) {
        console.warn('Failed to save blocks:', err);
      } finally {
        setSaving(false);
      }
    },
    [siteId],
  );

  // ── Block actions ─────────────────────────────────────────────────────

  const handleToggleVisibility = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        const updated = prev.map((b) =>
          b.id === blockId ? { ...b, visible: !(b.visible ?? true) } : b,
        );
        saveBlocks(updated);
        return updated;
      });
    },
    [saveBlocks],
  );

  const handleDelete = useCallback(
    (blockId: string, blockName: string) => {
      Alert.alert(
        'Delete Block',
        `Are you sure you want to delete "${blockName}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setBlocks((prev) => {
                const updated = prev.filter((b) => b.id !== blockId);
                saveBlocks(updated);
                return updated;
              });
            },
          },
        ],
      );
    },
    [saveBlocks],
  );

  const handleHide = useCallback(
    (blockId: string) => {
      handleToggleVisibility(blockId);
    },
    [handleToggleVisibility],
  );

  const handleBlockPress = useCallback(
    (block: Block) => {
      router.push({
        pathname: '/editor/block-config/[blockId]',
        params: {
          blockId: block.id,
          siteId: siteId!,
          blockType: block.type,
          blockName: block.title ?? block.name ?? block.type,
        },
      });
    },
    [router, siteId],
  );

  const handleAddBlock = useCallback(
    (blockType: typeof BLOCK_TYPES[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newBlock: Block = {
        id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: blockType.type,
        title: blockType.name,
        name: blockType.name,
        visible: true,
        config: {},
      };
      setBlocks((prev) => {
        const updated = [...prev, newBlock];
        saveBlocks(updated);
        return updated;
      });
      setShowPicker(false);
    },
    [saveBlocks],
  );

  // ── Manual drag-to-reorder ────────────────────────────────────────────

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setBlocks((prev) => {
        const updated = [...prev];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        saveBlocks(updated);
        return updated;
      });
    },
    [saveBlocks],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      setBlocks((prev) => {
        if (index >= prev.length - 1) return prev;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = [...prev];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        saveBlocks(updated);
        return updated;
      });
    },
    [saveBlocks],
  );

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Blocks',
            headerStyle: { backgroundColor: colors.cream },
            headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.olive} />
          <Text style={styles.loadingText}>Loading blocks...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Blocks',
            headerStyle: { backgroundColor: colors.cream },
            headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchBlocks}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Blocks',
          headerStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
          headerShadowVisible: false,
          headerRight: () =>
            saving ? (
              <ActivityIndicator
                size="small"
                color={colors.olive}
                style={{ marginRight: spacing.md }}
              />
            ) : null,
        }}
      />

      <View style={styles.container}>
        {blocks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\u{1F9F1}'}</Text>
            <Text style={styles.emptyTitle}>No Blocks</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to add your first block
            </Text>
          </View>
        ) : (
          <FlatList
            data={blocks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View>
                <BlockRow
                  id={item.id}
                  name={item.title ?? item.name ?? item.type}
                  type={item.type}
                  visible={item.visible ?? true}
                  onPress={() => handleBlockPress(item)}
                  onToggleVisibility={() => handleToggleVisibility(item.id)}
                  onDelete={() =>
                    handleDelete(item.id, item.title ?? item.name ?? item.type)
                  }
                  onHide={() => handleHide(item.id)}
                />
                {/* Reorder buttons */}
                <View style={styles.reorderRow}>
                  {index > 0 && (
                    <Pressable
                      style={styles.reorderBtn}
                      onPress={() => handleMoveUp(index)}
                    >
                      <Text style={styles.reorderIcon}>{'\u25B2'}</Text>
                    </Pressable>
                  )}
                  {index < blocks.length - 1 && (
                    <Pressable
                      style={styles.reorderBtn}
                      onPress={() => handleMoveDown(index)}
                    >
                      <Text style={styles.reorderIcon}>{'\u25BC'}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add Block Button */}
        <Animated.View
          style={[
            styles.addBtnWrapper,
            { transform: [{ scale: addBtnScale }] },
          ]}
        >
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPicker(true);
            }}
          >
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnText}>Add Block</Text>
          </Pressable>
        </Animated.View>

        {/* Block Picker Modal */}
        <Modal
          visible={showPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Block</Text>
              <Pressable
                onPress={() => setShowPicker(false)}
                hitSlop={12}
              >
                <Text style={styles.modalClose}>{'\u2715'}</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {BLOCK_TYPES.map((bt) => (
                <Pressable
                  key={bt.type}
                  style={styles.pickerItem}
                  onPress={() => handleAddBlock(bt)}
                >
                  <Text style={styles.pickerIcon}>{bt.icon}</Text>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerName}>{bt.name}</Text>
                    <Text style={styles.pickerDesc}>{bt.description}</Text>
                  </View>
                  <Text style={styles.pickerArrow}>{'\u203A'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
    padding: spacing.xl,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.md,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.white,
  },
  listContent: {
    paddingBottom: 120,
  },
  reorderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: 2,
    backgroundColor: colors.cream,
  },
  reorderBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
  },
  reorderIcon: {
    fontSize: 10,
    color: colors.muted,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  // Add button
  addBtnWrapper: {
    position: 'absolute',
    bottom: 30,
    left: spacing.lg,
    right: spacing.lg,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.olive,
    paddingVertical: 16,
    borderRadius: radius.lg,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  addBtnIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: colors.white,
  },
  addBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
  },
  modalClose: {
    fontSize: 20,
    color: colors.muted,
    padding: spacing.sm,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: 40,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  pickerIcon: {
    fontSize: 28,
    width: 44,
    textAlign: 'center',
  },
  pickerInfo: {
    flex: 1,
  },
  pickerName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.ink,
  },
  pickerDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  pickerArrow: {
    fontSize: 24,
    color: colors.muted,
  },
});

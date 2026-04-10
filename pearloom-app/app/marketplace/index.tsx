import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Animated,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import type { MarketplaceTemplate } from '@/lib/types';
import TemplateCard from '@/components/TemplateCard';
import ColorPalette from '@/components/ColorPalette';

// ── Local template data (fallback when API is unavailable) ──────────────

const SITE_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'tpl-golden-hour',
    name: 'Golden Hour',
    tagline: 'Warm sunset tones for a dreamy celebration',
    description:
      'A romantic template inspired by golden hour light. Features warm amber gradients, elegant serif typography, and soft shadow overlays. Perfect for outdoor and garden celebrations.',
    category: 'wedding',
    colors: ['#C4A96A', '#E8D5A3', '#F5E6C8', '#A3876A', '#6D5A3E'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 8,
    blocks: ['Hero', 'Story', 'Timeline', 'Gallery', 'RSVP', 'Registry', 'Venue', 'Footer'],
    popular: true,
  },
  {
    id: 'tpl-garden-bloom',
    name: 'Garden Bloom',
    tagline: 'Fresh botanicals and lush greens',
    description:
      'A botanical garden-inspired design with watercolor florals and leafy accents. Blends sage greens with blush pinks for a refined natural feel.',
    category: 'wedding',
    colors: ['#A3B18A', '#DAD7CD', '#EDE8D5', '#C2A878', '#5A7247'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 7,
    blocks: ['Hero', 'Couple', 'Timeline', 'Gallery', 'RSVP', 'Venue', 'Footer'],
    popular: true,
  },
  {
    id: 'tpl-midnight-plum',
    name: 'Midnight Plum',
    tagline: 'Deep jewel tones for a luxurious affair',
    description:
      'Rich plum and midnight blue create an atmosphere of opulence and sophistication. Gold accents add warmth to the dark palette.',
    category: 'engagement',
    colors: ['#6D597A', '#3D2C47', '#1A1425', '#C4A96A', '#9B7FC4'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 6,
    blocks: ['Hero', 'Story', 'Gallery', 'Details', 'RSVP', 'Footer'],
    price: 4.99,
  },
  {
    id: 'tpl-confetti-pop',
    name: 'Confetti Pop',
    tagline: 'Bright and bold for birthday parties',
    description:
      'A vibrant, energetic template with confetti patterns, bold colors, and playful typography. Makes every birthday unforgettable.',
    category: 'birthday',
    colors: ['#FF6B6B', '#FFC947', '#4ECDC4', '#6C5CE7', '#FF85A2'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 6,
    blocks: ['Hero', 'Details', 'Gallery', 'RSVP', 'Wishlist', 'Footer'],
    price: 2.99,
    popular: true,
  },
  {
    id: 'tpl-pearl-classic',
    name: 'Pearl Classic',
    tagline: 'Timeless elegance in ivory and gold',
    description:
      'The signature Pearloom design with a classic ivory palette, gold foil accents, and refined serif typography. A versatile choice for any occasion.',
    category: 'wedding',
    colors: ['#FAF7F2', '#C4A96A', '#A3B18A', '#3D3530', '#FFFFFF'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 9,
    blocks: ['Hero', 'Story', 'Couple', 'Timeline', 'Gallery', 'RSVP', 'Registry', 'Venue', 'Footer'],
  },
  {
    id: 'tpl-silver-jubilee',
    name: 'Silver Jubilee',
    tagline: 'Celebrating milestones with timeless silver',
    description:
      'A distinguished template for anniversaries with silver gradients, champagne accents, and classic typography that honors the years together.',
    category: 'anniversary',
    colors: ['#C0C0C0', '#E8E8E8', '#B8A88A', '#4A4A5A', '#F5F5F5'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 7,
    blocks: ['Hero', 'Journey', 'Milestones', 'Gallery', 'Celebration', 'RSVP', 'Footer'],
    price: 3.99,
  },
  {
    id: 'tpl-sunset-terrace',
    name: 'Sunset Terrace',
    tagline: 'Mediterranean warmth and rustic charm',
    description:
      'Inspired by Mediterranean sunsets with terracotta, warm ochre, and olive green. Includes rustic texture overlays and handwritten-style accents.',
    category: 'engagement',
    colors: ['#D4855A', '#E8B77A', '#A3B18A', '#F5E6C8', '#8B5E3C'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 6,
    blocks: ['Hero', 'Story', 'Gallery', 'Details', 'RSVP', 'Footer'],
    price: 4.99,
  },
  {
    id: 'tpl-minimal-zen',
    name: 'Minimal Zen',
    tagline: 'Clean lines and peaceful simplicity',
    description:
      'A minimalist template with generous whitespace, precise typography, and subtle ink-wash accents. For couples who value understated beauty.',
    category: 'wedding',
    colors: ['#FAFAFA', '#1C1C1C', '#D4D0C8', '#A3B18A', '#E8E4DC'],
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    blockCount: 5,
    blocks: ['Hero', 'Details', 'Gallery', 'RSVP', 'Footer'],
  },
];

// ── Top tabs ────────────────────────────────────────────────────────────

type TopTab = 'templates' | 'themes' | 'assetPacks';

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'templates', label: 'Templates' },
  { key: 'themes', label: 'Themes' },
  { key: 'assetPacks', label: 'Asset Packs' },
];

// ── Categories ──────────────────────────────────────────────────────────

type Category = 'all' | 'wedding' | 'birthday' | 'anniversary' | 'engagement';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'anniversary', label: 'Anniversary' },
  { key: 'engagement', label: 'Engagement' },
];

// ── Bottom Sheet Detail ─────────────────────────────────────────────────

function TemplateBottomSheet({
  template,
  visible,
  onClose,
  onUse,
}: {
  template: MarketplaceTemplate | null;
  visible: boolean;
  onClose: () => void;
  onUse: (t: MarketplaceTemplate) => void;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible, slideAnim]);

  if (!template) return null;

  const isFree = !template.price || template.price === 0;
  const isOwned = template.owned ?? false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            sheetStyles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Pressable onPress={() => {}}>
            {/* Drag handle */}
            <View style={sheetStyles.handleRow}>
              <View style={sheetStyles.handle} />
            </View>

            {/* Preview gradient */}
            <LinearGradient
              colors={[
                template.colors?.[0] ?? colors.olive,
                template.colors?.[1] ?? colors.gold,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={sheetStyles.preview}
            >
              <Text style={sheetStyles.previewLetter}>
                {template.name.charAt(0)}
              </Text>
            </LinearGradient>

            <View style={sheetStyles.content}>
              {/* Name & tagline */}
              <Text style={sheetStyles.name}>{template.name}</Text>
              {template.tagline && (
                <Text style={sheetStyles.tagline}>{template.tagline}</Text>
              )}

              {/* Description */}
              {template.description && (
                <Text style={sheetStyles.description}>
                  {template.description}
                </Text>
              )}

              {/* Font preview */}
              <View style={sheetStyles.infoRow}>
                <FontAwesome
                  name="font"
                  size={13}
                  color={colors.muted}
                />
                <Text style={sheetStyles.infoText}>
                  {template.headingFont ?? 'Playfair Display'} /{' '}
                  {template.bodyFont ?? 'Inter'}
                </Text>
              </View>

              {/* Block count */}
              {template.blockCount && (
                <View style={sheetStyles.infoRow}>
                  <FontAwesome
                    name="th-large"
                    size={13}
                    color={colors.muted}
                  />
                  <Text style={sheetStyles.infoText}>
                    {template.blockCount} blocks
                    {template.blocks
                      ? ` — ${template.blocks.join(', ')}`
                      : ''}
                  </Text>
                </View>
              )}

              {/* Color palette */}
              <View style={sheetStyles.paletteRow}>
                <Text style={sheetStyles.paletteLabel}>Color Palette</Text>
                <ColorPalette palette={template.colors} size={28} />
              </View>

              {/* CTA */}
              <Pressable
                style={[
                  sheetStyles.ctaButton,
                  !(isFree || isOwned) && sheetStyles.ctaButtonBuy,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onUse(template);
                }}
              >
                <Text
                  style={[
                    sheetStyles.ctaText,
                    !(isFree || isOwned) && sheetStyles.ctaTextBuy,
                  ]}
                >
                  {isOwned
                    ? 'Use This Template'
                    : isFree
                    ? 'Use This Template'
                    : `Purchase $${template.price!.toFixed(2)}`}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────

export default function MarketplaceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TopTab>('templates');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>(SITE_TEMPLATES);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetTemplate, setSheetTemplate] = useState<MarketplaceTemplate | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Column count: 2 on phone, 3 on tablet
  const numColumns = width >= 768 ? 3 : 2;

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tagline?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, activeCategory, searchQuery]);

  // ── Fetch from API ────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiFetch<MarketplaceTemplate[]>(
        '/api/marketplace/templates',
      );
      if (data && data.length > 0) {
        setTemplates(data);
      }
    } catch {
      // Use local fallback data (already set)
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  }, [fetchTemplates]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleTabPress = useCallback(
    (tab: TopTab) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(tab);
      if (tab === 'assetPacks') {
        router.push('/marketplace/asset-packs');
      }
    },
    [router],
  );

  const handleCategoryPress = useCallback((cat: Category) => {
    Haptics.selectionAsync();
    setActiveCategory(cat);
  }, []);

  const handleCardPress = useCallback((t: MarketplaceTemplate) => {
    setSheetTemplate(t);
    setSheetVisible(true);
  }, []);

  const handleCardUseTap = useCallback(
    (t: MarketplaceTemplate) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: '/marketplace/template-detail',
        params: { id: t.id },
      });
    },
    [router],
  );

  const handleSheetUse = useCallback(
    (t: MarketplaceTemplate) => {
      setSheetVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: '/marketplace/template-detail',
        params: { id: t.id },
      });
    },
    [router],
  );

  const handleSearchFocus = useCallback(() => {
    setSearchActive(true);
  }, []);

  const handleSearchCancel = useCallback(() => {
    setSearchActive(false);
    setSearchQuery('');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  const renderTemplateCard = useCallback(
    ({ item }: { item: MarketplaceTemplate }) => (
      <TemplateCard
        template={item}
        onPress={handleCardPress}
        onUseTap={handleCardUseTap}
      />
    ),
    [handleCardPress, handleCardUseTap],
  );

  const keyExtractor = useCallback((item: MarketplaceTemplate) => item.id, []);

  return (
    <View style={styles.screen}>
      {/* Top tab pills */}
      <View style={styles.topTabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topTabScroll}
        >
          {TOP_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.topTabPill,
                activeTab === tab.key && styles.topTabPillActive,
              ]}
              onPress={() => handleTabPress(tab.key)}
            >
              <Text
                style={[
                  styles.topTabText,
                  activeTab === tab.key && styles.topTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome
            name="search"
            size={14}
            color={colors.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            returnKeyType="search"
          />
        </View>
        {searchActive && (
          <Pressable style={styles.cancelButton} onPress={handleSearchCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Category filter pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryPill,
                activeCategory === cat.key && styles.categoryPillActive,
              ]}
              onPress={() => handleCategoryPress(cat.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Template grid */}
      {filteredTemplates.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="search" size={32} color={colors.muted + '66'} />
          <Text style={styles.emptyTitle}>No templates found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlatList
          key={`grid-${numColumns}`}
          data={filteredTemplates}
          renderItem={renderTemplateCard}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.olive}
              colors={[colors.olive]}
              progressBackgroundColor={colors.cream}
            />
          }
        />
      )}

      {/* Bottom sheet detail */}
      <TemplateBottomSheet
        template={sheetTemplate}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onUse={handleSheetUse}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // Top tabs
  topTabContainer: {
    backgroundColor: colors.cream,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  topTabScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  topTabPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.creamDeep,
  },
  topTabPillActive: {
    backgroundColor: colors.olive,
  },
  topTabText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.inkSoft,
  },
  topTabTextActive: {
    color: colors.white,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.creamDeep,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    height: '100%',
    padding: 0,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xs,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.olive,
  },

  // Categories
  categoryContainer: {
    backgroundColor: colors.cream,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    backgroundColor: colors.white,
  },
  categoryPillActive: {
    borderColor: colors.olive,
    backgroundColor: colors.olive + '12',
  },
  categoryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
  },
  categoryTextActive: {
    color: colors.olive,
    fontFamily: fonts.bodySemibold,
  },

  // Grid
  gridContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
});

// ── Bottom sheet styles ─────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.creamDeep,
  },
  preview: {
    height: 140,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  previewLetter: {
    fontFamily: fonts.heading,
    fontSize: 56,
    color: 'rgba(255,255,255,0.4)',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    gap: spacing.md,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
  paletteRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  paletteLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ctaButton: {
    backgroundColor: colors.olive,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaButtonBuy: {
    backgroundColor: colors.ink,
  },
  ctaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
  ctaTextBuy: {
    color: colors.white,
  },
});

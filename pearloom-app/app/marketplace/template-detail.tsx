import React, { useMemo, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import type { MarketplaceTemplate } from '@/lib/types';
import ColorPalette from '@/components/ColorPalette';

// ── Local template data (same as marketplace index fallback) ────────────

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

export default function TemplateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showCheckout, setShowCheckout] = useState(false);
  const [personalizeVisible, setPersonalizeVisible] = useState(false);
  const [pName1, setPName1] = useState('');
  const [pName2, setPName2] = useState('');
  const [pOccasion, setPOccasion] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const template = useMemo(
    () => SITE_TEMPLATES.find((t) => t.id === id) ?? SITE_TEMPLATES[0],
    [id],
  );

  const isFree = !template.price || template.price === 0;
  const isOwned = template.owned ?? false;

  // ── Animations ────────────────────────────────────────────────────────

  const ctaScale = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, headerSlide]);

  const onCtaPressIn = useCallback(() => {
    Animated.spring(ctaScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [ctaScale]);

  const onCtaPressOut = useCallback(() => {
    Animated.spring(ctaScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [ctaScale]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleUseTemplate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isFree || isOwned) {
      setApplyError(null);
      setPersonalizeVisible(true);
    } else {
      setShowCheckout(true);
    }
  }, [isFree, isOwned]);

  const handleApplyTemplate = useCallback(async () => {
    if (!pName1.trim() || !pName2.trim()) {
      setApplyError('Please enter both names.');
      return;
    }
    setApplying(true);
    setApplyError(null);
    try {
      const result = await apiFetch<{ siteId: string; domain: string }>(
        '/api/sites/create-from-template',
        {
          method: 'POST',
          body: JSON.stringify({
            templateId: template.id,
            names: [pName1.trim(), pName2.trim()],
            occasion: pOccasion.trim() || template.category,
            templateManifest: {
              colors: template.colors,
              headingFont: template.headingFont,
              bodyFont: template.bodyFont,
              blocks: template.blocks,
            },
          }),
        },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPersonalizeVisible(false);
      router.replace(`/editor/${result.siteId}`);
    } catch (err: any) {
      setApplyError(err?.message ?? 'Failed to create site. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setApplying(false);
    }
  }, [pName1, pName2, pOccasion, template, router]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  // ── Stripe checkout WebView ───────────────────────────────────────────

  if (showCheckout) {
    return (
      <View style={styles.screen}>
        <View style={styles.checkoutHeader}>
          <Pressable style={styles.backButton} onPress={() => setShowCheckout(false)}>
            <FontAwesome name="arrow-left" size={18} color={colors.ink} />
          </Pressable>
          <Text style={styles.checkoutTitle}>Complete Purchase</Text>
          <View style={{ width: 40 }} />
        </View>
        <WebView
          source={{
            uri: `https://pearloom.com/api/checkout?templateId=${template.id}&price=${template.price}`,
          }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
            if (navState.url.includes('/checkout/success')) {
              setShowCheckout(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Purchase Complete',
                `"${template.name}" is now yours! You can use it on any of your sites.`,
                [
                  {
                    text: 'Use Now',
                    onPress: () => router.replace('/(tabs)/edit'),
                  },
                ],
              );
            }
          }}
        />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Full-screen preview */}
        <LinearGradient
          colors={[
            template.colors[0] ?? colors.olive,
            template.colors[1] ?? colors.gold,
            template.colors[2] ?? colors.cream,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Back button */}
          <Pressable style={styles.heroBackButton} onPress={handleBack}>
            <FontAwesome name="arrow-left" size={16} color={colors.white} />
          </Pressable>

          {/* Decorative preview illustration */}
          <View style={styles.heroDecor}>
            <View style={styles.heroCircle} />
            <View style={styles.heroLine1} />
            <View style={styles.heroLine2} />
            <View style={styles.heroLine3} />
            <Text style={styles.heroInitial}>{template.name.charAt(0)}</Text>
          </View>

          {/* Price overlay */}
          <View
            style={[
              styles.heroPriceBadge,
              isFree && styles.heroPriceBadgeFree,
            ]}
          >
            <Text style={styles.heroPriceText}>
              {isOwned
                ? 'Owned'
                : isFree
                ? 'Free'
                : `$${template.price!.toFixed(2)}`}
            </Text>
          </View>
        </LinearGradient>

        {/* Content */}
        <Animated.View
          style={[
            styles.contentSection,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          {/* Template name */}
          <Text style={styles.templateName}>{template.name}</Text>

          {/* Tagline */}
          {template.tagline && (
            <Text style={styles.tagline}>{template.tagline}</Text>
          )}

          {/* Category badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {template.category.charAt(0).toUpperCase() +
                template.category.slice(1)}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {template.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this template</Text>
              <Text style={styles.descriptionText}>
                {template.description}
              </Text>
            </View>
          )}

          {/* Font pairing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Font Pairing</Text>
            <View style={styles.fontCard}>
              <View style={styles.fontRow}>
                <View style={styles.fontIconBox}>
                  <Text style={styles.fontIconLetter}>Aa</Text>
                </View>
                <View style={styles.fontInfo}>
                  <Text style={styles.fontName}>
                    {template.headingFont ?? 'Playfair Display'}
                  </Text>
                  <Text style={styles.fontRole}>Heading</Text>
                </View>
              </View>
              <View style={styles.fontDivider} />
              <View style={styles.fontRow}>
                <View style={[styles.fontIconBox, styles.fontIconBoxBody]}>
                  <Text style={styles.fontIconLetterBody}>Aa</Text>
                </View>
                <View style={styles.fontInfo}>
                  <Text style={styles.fontNameBody}>
                    {template.bodyFont ?? 'Inter'}
                  </Text>
                  <Text style={styles.fontRole}>Body</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Block list */}
          {template.blocks && template.blocks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Included Blocks ({template.blockCount ?? template.blocks.length})
              </Text>
              <View style={styles.blockGrid}>
                {template.blocks.map((block) => (
                  <View key={block} style={styles.blockChip}>
                    <FontAwesome
                      name="th-large"
                      size={10}
                      color={colors.olive}
                    />
                    <Text style={styles.blockChipText}>{block}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Color palette */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color Palette</Text>
            <View style={styles.paletteCard}>
              <ColorPalette
                palette={template.colors}
                size={40}
                showLabels
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky CTA at bottom */}
      <View style={styles.ctaContainer}>
        <Animated.View style={{ transform: [{ scale: ctaScale }], flex: 1 }}>
          <Pressable
            style={[
              styles.ctaButton,
              !(isFree || isOwned) && styles.ctaButtonPaid,
            ]}
            onPress={handleUseTemplate}
            onPressIn={onCtaPressIn}
            onPressOut={onCtaPressOut}
          >
            {!(isFree || isOwned) && (
              <FontAwesome
                name="lock"
                size={14}
                color={colors.white}
                style={{ marginRight: spacing.sm }}
              />
            )}
            <Text style={styles.ctaText}>
              {isOwned
                ? 'Use This Template'
                : isFree
                ? 'Use This Template'
                : `Purchase $${template.price!.toFixed(2)}`}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Personalize Modal */}
      <Modal
        visible={personalizeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPersonalizeVisible(false)}
      >
        <View style={styles.personalizeOverlay}>
          <View style={styles.personalizeCard}>
            <Text style={styles.personalizeTitle}>Personalize Your Site</Text>
            <Text style={styles.personalizeSubtitle}>
              Using the "{template.name}" template
            </Text>

            <Text style={styles.personalizeLabel}>Partner 1</Text>
            <TextInput
              style={styles.personalizeInput}
              placeholder="First name"
              placeholderTextColor={colors.muted}
              value={pName1}
              onChangeText={setPName1}
              autoCapitalize="words"
            />

            <Text style={styles.personalizeLabel}>Partner 2</Text>
            <TextInput
              style={styles.personalizeInput}
              placeholder="First name"
              placeholderTextColor={colors.muted}
              value={pName2}
              onChangeText={setPName2}
              autoCapitalize="words"
            />

            <Text style={styles.personalizeLabel}>Occasion (optional)</Text>
            <TextInput
              style={styles.personalizeInput}
              placeholder={template.category}
              placeholderTextColor={colors.muted}
              value={pOccasion}
              onChangeText={setPOccasion}
              autoCapitalize="sentences"
            />

            {applyError && (
              <Text style={styles.personalizeError}>{applyError}</Text>
            )}

            <Pressable
              style={[styles.personalizeBtn, applying && { opacity: 0.6 }]}
              onPress={handleApplyTemplate}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.personalizeBtnText}>Create Site</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.personalizeCancel}
              onPress={() => setPersonalizeVisible(false)}
            >
              <Text style={styles.personalizeCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero
  heroGradient: {
    height: 300,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroDecor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    position: 'absolute',
    top: -20,
  },
  heroLine1: {
    width: 120,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    position: 'absolute',
    bottom: -30,
  },
  heroLine2: {
    width: 80,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    bottom: -42,
  },
  heroLine3: {
    width: 50,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    position: 'absolute',
    bottom: -52,
  },
  heroInitial: {
    fontFamily: fonts.heading,
    fontSize: 72,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 4,
  },
  heroPriceBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  heroPriceBadgeFree: {
    backgroundColor: colors.success + 'DD',
  },
  heroPriceText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.3,
  },

  // Content
  contentSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  templateName: {
    fontFamily: fonts.heading,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.muted,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.olive + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  categoryBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.olive,
  },
  divider: {
    height: 1,
    backgroundColor: colors.creamDeep,
    marginVertical: spacing.xl,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 23,
  },

  // Font card
  fontCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fontIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.olive + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontIconBoxBody: {
    backgroundColor: colors.ink + '08',
  },
  fontIconLetter: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.olive,
  },
  fontIconLetterBody: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  fontInfo: {
    flex: 1,
    gap: 2,
  },
  fontName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  fontNameBody: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  fontRole: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  fontDivider: {
    height: 1,
    backgroundColor: colors.creamDeep,
    marginVertical: spacing.md,
    marginLeft: 44 + spacing.md,
  },

  // Block grid
  blockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  blockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.creamDeep,
  },
  blockChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSoft,
  },

  // Palette card
  paletteCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    backgroundColor: colors.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.creamDeep,
    flexDirection: 'row',
  },
  ctaButton: {
    backgroundColor: colors.olive,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.olive,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ctaButtonPaid: {
    backgroundColor: colors.ink,
  },
  ctaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.2,
  },

  // Checkout
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.cream,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.ink,
  },
  webview: {
    flex: 1,
  },

  // Personalize modal
  personalizeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  personalizeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },
  personalizeTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  personalizeSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  personalizeLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  personalizeInput: {
    borderWidth: 1.5,
    borderColor: colors.creamDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  personalizeError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  personalizeBtn: {
    backgroundColor: colors.olive,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  personalizeBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
  personalizeCancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  personalizeCancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.muted,
  },
});

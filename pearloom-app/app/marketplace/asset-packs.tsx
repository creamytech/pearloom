import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import type { AssetPack, AssetPackItem } from '@/lib/types';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Local asset pack data ───────────────────────────────────────────────

const ASSET_PACKS: AssetPack[] = [
  {
    id: 'pack-botanical',
    name: 'Botanical Collection',
    description:
      'Hand-drawn botanical illustrations including leaves, flowers, and vine borders. Perfect for garden and nature-themed celebrations.',
    itemCount: 24,
    price: 6.99,
    gradientColors: ['#A3B18A', '#5A7247'],
    items: [
      { id: 'b1', name: 'Eucalyptus Branch', type: 'illustration' },
      { id: 'b2', name: 'Rose Cluster', type: 'illustration' },
      { id: 'b3', name: 'Fern Leaf', type: 'illustration' },
      { id: 'b4', name: 'Vine Border Left', type: 'border' },
      { id: 'b5', name: 'Vine Border Right', type: 'border' },
      { id: 'b6', name: 'Floral Divider', type: 'divider' },
      { id: 'b7', name: 'Leaf Pattern', type: 'pattern' },
      { id: 'b8', name: 'Wreath Icon', type: 'icon' },
    ],
  },
  {
    id: 'pack-gold-foil',
    name: 'Gold Foil Accents',
    description:
      'Luxurious gold foil textures, borders, and ornamental elements. Add a touch of glamour to any template.',
    itemCount: 18,
    price: 4.99,
    gradientColors: ['#C4A96A', '#8B7233'],
    items: [
      { id: 'g1', name: 'Gold Foil Texture', type: 'pattern' },
      { id: 'g2', name: 'Ornamental Corner', type: 'border' },
      { id: 'g3', name: 'Gold Frame', type: 'border' },
      { id: 'g4', name: 'Sparkle Divider', type: 'divider' },
      { id: 'g5', name: 'Foil Heart', type: 'icon' },
      { id: 'g6', name: 'Monogram Frame', type: 'illustration' },
    ],
  },
  {
    id: 'pack-watercolor',
    name: 'Watercolor Washes',
    description:
      'Soft watercolor backgrounds, splash effects, and painterly accents. Beautiful for romantic and artistic designs.',
    itemCount: 15,
    price: 5.99,
    gradientColors: ['#E8B4C8', '#9B7FC4'],
    items: [
      { id: 'w1', name: 'Blush Wash', type: 'pattern' },
      { id: 'w2', name: 'Lavender Splash', type: 'illustration' },
      { id: 'w3', name: 'Sunset Gradient', type: 'pattern' },
      { id: 'w4', name: 'Paint Stroke Divider', type: 'divider' },
      { id: 'w5', name: 'Watercolor Blob', type: 'illustration' },
    ],
  },
  {
    id: 'pack-celebration',
    name: 'Celebration Icons',
    description:
      'Fun, festive icons for birthdays, parties, and celebrations. Includes confetti, balloons, cakes, and more.',
    itemCount: 30,
    price: 3.99,
    gradientColors: ['#FF6B6B', '#6C5CE7'],
    items: [
      { id: 'c1', name: 'Balloon Bunch', type: 'icon' },
      { id: 'c2', name: 'Confetti Burst', type: 'illustration' },
      { id: 'c3', name: 'Birthday Cake', type: 'icon' },
      { id: 'c4', name: 'Party Hat', type: 'icon' },
      { id: 'c5', name: 'Gift Box', type: 'icon' },
      { id: 'c6', name: 'Streamer Border', type: 'border' },
      { id: 'c7', name: 'Confetti Pattern', type: 'pattern' },
    ],
  },
  {
    id: 'pack-minimal',
    name: 'Minimal Lines',
    description:
      'Clean geometric shapes, thin line icons, and minimal borders for modern, understated designs.',
    itemCount: 20,
    price: 3.99,
    gradientColors: ['#3D3530', '#9A9488'],
    items: [
      { id: 'm1', name: 'Thin Line Divider', type: 'divider' },
      { id: 'm2', name: 'Geometric Frame', type: 'border' },
      { id: 'm3', name: 'Circle Monogram', type: 'illustration' },
      { id: 'm4', name: 'Arrow Icons', type: 'icon' },
      { id: 'm5', name: 'Dot Pattern', type: 'pattern' },
    ],
  },
];

// ── Asset Pack Card ─────────────────────────────────────────────────────

function AssetPackCard({
  pack,
  onBuy,
}: {
  pack: AssetPack;
  onBuy: (pack: AssetPack) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const toggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
    Animated.spring(chevronRotation, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [expanded, chevronRotation]);

  const handleBuy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBuy(pack);
  }, [pack, onBuy]);

  const chevronRotate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const isOwned = pack.owned ?? false;

  const getItemIcon = (type: AssetPackItem['type']): React.ComponentProps<typeof FontAwesome>['name'] => {
    switch (type) {
      case 'illustration':
        return 'picture-o';
      case 'icon':
        return 'star-o';
      case 'pattern':
        return 'th';
      case 'border':
        return 'square-o';
      case 'divider':
        return 'minus';
      default:
        return 'file-o';
    }
  };

  return (
    <Animated.View
      style={[cardStyles.outer, { transform: [{ scale: scaleAnim }] }]}
    >
      <Pressable
        style={cardStyles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={toggleExpanded}
      >
        {/* Preview gradient */}
        <LinearGradient
          colors={pack.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyles.gradient}
        >
          {/* Decorative elements */}
          <View style={cardStyles.gradientDecor}>
            <View style={cardStyles.decorDot1} />
            <View style={cardStyles.decorDot2} />
            <View style={cardStyles.decorDot3} />
          </View>

          {/* Item count badge */}
          <View style={cardStyles.countBadge}>
            <Text style={cardStyles.countText}>{pack.itemCount} items</Text>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={cardStyles.body}>
          <View style={cardStyles.nameRow}>
            <View style={cardStyles.nameInfo}>
              <Text style={cardStyles.packName}>{pack.name}</Text>
              {pack.description && (
                <Text style={cardStyles.packDesc} numberOfLines={2}>
                  {pack.description}
                </Text>
              )}
            </View>

            <Animated.View
              style={{ transform: [{ rotate: chevronRotate }] }}
            >
              <FontAwesome
                name="chevron-down"
                size={12}
                color={colors.muted}
              />
            </Animated.View>
          </View>

          {/* Price + buy */}
          <View style={cardStyles.priceRow}>
            <Text style={cardStyles.price}>
              ${pack.price.toFixed(2)}
            </Text>

            <Pressable
              style={[
                cardStyles.buyButton,
                isOwned && cardStyles.buyButtonOwned,
              ]}
              onPress={handleBuy}
            >
              <Text
                style={[
                  cardStyles.buyText,
                  isOwned && cardStyles.buyTextOwned,
                ]}
              >
                {isOwned ? 'Owned' : 'Buy Pack'}
              </Text>
            </Pressable>
          </View>

          {/* Expanded items */}
          {expanded && (
            <View style={cardStyles.itemsList}>
              <View style={cardStyles.itemsDivider} />
              <Text style={cardStyles.itemsTitle}>Pack Contents</Text>
              {pack.items.map((item) => (
                <View key={item.id} style={cardStyles.itemRow}>
                  <View style={cardStyles.itemIconBox}>
                    <FontAwesome
                      name={getItemIcon(item.type)}
                      size={12}
                      color={colors.olive}
                    />
                  </View>
                  <Text style={cardStyles.itemName}>{item.name}</Text>
                  <View style={cardStyles.itemTypeBadge}>
                    <Text style={cardStyles.itemTypeText}>{item.type}</Text>
                  </View>
                </View>
              ))}
              {pack.items.length < pack.itemCount && (
                <Text style={cardStyles.moreItems}>
                  + {pack.itemCount - pack.items.length} more items
                </Text>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────

export default function AssetPacksScreen() {
  const router = useRouter();
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPack, setCheckoutPack] = useState<AssetPack | null>(null);

  const handleBuy = useCallback((pack: AssetPack) => {
    if (pack.owned) {
      Alert.alert('Already Owned', `You already own "${pack.name}".`);
      return;
    }
    setCheckoutPack(pack);
    setShowCheckout(true);
  }, []);

  // ── Stripe checkout WebView ───────────────────────────────────────────

  if (showCheckout && checkoutPack) {
    return (
      <View style={styles.screen}>
        <View style={styles.checkoutHeader}>
          <Pressable
            style={styles.backButton}
            onPress={() => setShowCheckout(false)}
          >
            <FontAwesome name="arrow-left" size={18} color={colors.ink} />
          </Pressable>
          <Text style={styles.checkoutTitle}>
            Purchase {checkoutPack.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <WebView
          source={{
            uri: `https://pearloom.com/api/checkout?packId=${checkoutPack.id}&price=${checkoutPack.price}`,
          }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
            if (navState.url.includes('/checkout/success')) {
              setShowCheckout(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert(
                'Purchase Complete',
                `"${checkoutPack.name}" has been added to your asset library.`,
              );
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Asset Packs</Text>
          <Text style={styles.headerSubtitle}>
            Premium illustrations, icons, patterns, and borders to elevate your
            celebration site.
          </Text>
        </View>

        {/* Pack cards */}
        {ASSET_PACKS.map((pack) => (
          <AssetPackCard key={pack.id} pack={pack} onBuy={handleBuy} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Screen styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs,
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
    fontSize: 15,
    color: colors.ink,
    flex: 1,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
});

// ── Card styles ─────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  outer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradient: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  decorDot1: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -10,
    right: 30,
  },
  decorDot2: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: 10,
    left: 20,
  },
  decorDot3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 20,
    left: -20,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  countText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.3,
  },
  body: {
    padding: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  nameInfo: {
    flex: 1,
  },
  packName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  packDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
  buyButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  buyButtonOwned: {
    backgroundColor: colors.olive + '15',
  },
  buyText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.white,
  },
  buyTextOwned: {
    color: colors.olive,
  },

  // Expanded items
  itemsList: {
    marginTop: spacing.md,
  },
  itemsDivider: {
    height: 1,
    backgroundColor: colors.creamDeep,
    marginBottom: spacing.md,
  },
  itemsTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  itemIconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.olive + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
    flex: 1,
  },
  itemTypeBadge: {
    backgroundColor: colors.creamDeep,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  itemTypeText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  moreItems: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.olive,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
});

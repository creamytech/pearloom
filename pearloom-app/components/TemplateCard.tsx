import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import type { MarketplaceTemplate } from '@/lib/types';

interface TemplateCardProps {
  template: MarketplaceTemplate;
  onPress: (template: MarketplaceTemplate) => void;
  onUseTap?: (template: MarketplaceTemplate) => void;
}

export default function TemplateCard({
  template,
  onPress,
  onUseTap,
}: TemplateCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(template);
  }, [template, onPress]);

  const handleUseTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUseTap?.(template);
  }, [template, onUseTap]);

  const isFree = !template.price || template.price === 0;
  const isOwned = template.owned ?? false;
  const isPopular = template.popular ?? false;

  const bgColor = template.colors?.[0] ?? colors.olive;
  const accentColor = template.colors?.[1] ?? colors.gold;

  return (
    <Animated.View
      style={[styles.cardOuter, { transform: [{ scale: scaleAnim }] }]}
    >
      <Pressable
        style={styles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Preview area */}
        <LinearGradient
          colors={[bgColor, accentColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.previewArea}
        >
          {/* Decorative elements */}
          <View style={styles.previewDecor}>
            <View
              style={[
                styles.decorCircle,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            />
            <View
              style={[
                styles.decorLine,
                { backgroundColor: 'rgba(255,255,255,0.15)' },
              ]}
            />
            <View
              style={[
                styles.decorLine,
                styles.decorLineShort,
                { backgroundColor: 'rgba(255,255,255,0.12)' },
              ]}
            />
          </View>

          <Text style={styles.previewText} numberOfLines={1}>
            {template.name.charAt(0)}
          </Text>

          {/* Price badge */}
          <View
            style={[
              styles.priceBadge,
              isFree && styles.priceBadgeFree,
              isOwned && styles.priceBadgeOwned,
            ]}
          >
            <Text
              style={[
                styles.priceBadgeText,
                isFree && styles.priceBadgeTextFree,
                isOwned && styles.priceBadgeTextOwned,
              ]}
            >
              {isOwned ? 'Owned' : isFree ? 'Free' : `$${template.price!.toFixed(2)}`}
            </Text>
          </View>

          {/* Popular badge */}
          {isPopular && (
            <View style={styles.popularBadge}>
              <FontAwesome name="star" size={9} color={colors.gold} />
              <Text style={styles.popularBadgeText}>Popular</Text>
            </View>
          )}
        </LinearGradient>

        {/* Card body */}
        <View style={styles.body}>
          <Text style={styles.templateName} numberOfLines={1}>
            {template.name}
          </Text>
          {template.tagline ? (
            <Text style={styles.tagline} numberOfLines={2}>
              {template.tagline}
            </Text>
          ) : null}

          {/* Use/Buy button */}
          <Pressable
            style={[
              styles.actionButton,
              isFree || isOwned
                ? styles.actionButtonUse
                : styles.actionButtonBuy,
            ]}
            onPress={handleUseTap}
          >
            <Text
              style={[
                styles.actionButtonText,
                isFree || isOwned
                  ? styles.actionButtonTextUse
                  : styles.actionButtonTextBuy,
              ]}
            >
              {isOwned ? 'Use' : isFree ? 'Use' : 'Buy'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    flex: 1,
    margin: spacing.xs + 2,
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
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  previewArea: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewDecor: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  decorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    position: 'absolute',
    top: 15,
    left: '20%',
  },
  decorLine: {
    height: 2,
    width: '60%',
    borderRadius: 1,
    position: 'absolute',
    bottom: 30,
  },
  decorLineShort: {
    width: '40%',
    bottom: 20,
  },
  previewText: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  priceBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  priceBadgeFree: {
    backgroundColor: colors.success + 'DD',
  },
  priceBadgeOwned: {
    backgroundColor: colors.olive + 'DD',
  },
  priceBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.3,
  },
  priceBadgeTextFree: {
    color: colors.white,
  },
  priceBadgeTextOwned: {
    color: colors.white,
  },
  popularBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  popularBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  templateName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  actionButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonUse: {
    backgroundColor: colors.olive + '15',
  },
  actionButtonBuy: {
    backgroundColor: colors.ink,
  },
  actionButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  actionButtonTextUse: {
    color: colors.olive,
  },
  actionButtonTextBuy: {
    color: colors.white,
  },
});

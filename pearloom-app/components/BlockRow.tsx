import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/lib/theme';

// Block type icon mapping
const BLOCK_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  hero: { icon: '\u{1F3A8}', color: '#E8785E' },
  story: { icon: '\u{1F4D6}', color: '#7C6FA0' },
  events: { icon: '\u{1F4C5}', color: '#5B9BD5' },
  event: { icon: '\u{1F4C5}', color: '#5B9BD5' },
  rsvp: { icon: '\u{1F48C}', color: '#E88CA5' },
  registry: { icon: '\u{1F381}', color: '#D4A76A' },
  travel: { icon: '\u{2708}', color: '#6BAEBC' },
  faq: { icon: '\u{2753}', color: '#8BB174' },
  guestbook: { icon: '\u{1F4AC}', color: '#B08ED1' },
  photos: { icon: '\u{1F4F7}', color: '#E8A758' },
  gallery: { icon: '\u{1F4F7}', color: '#E8A758' },
  quote: { icon: '\u{201C}', color: '#C4A96A' },
  countdown: { icon: '\u{23F3}', color: '#E87373' },
  spotify: { icon: '\u{1F3B5}', color: '#1DB954' },
  hashtag: { icon: '#', color: '#5B8DD9' },
  video: { icon: '\u{1F3AC}', color: '#E85D75' },
  text: { icon: '\u{1F4DD}', color: '#8A8780' },
};

export interface BlockRowProps {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  onPress?: () => void;
  onToggleVisibility?: () => void;
  onDelete?: () => void;
  onHide?: () => void;
}

export default function BlockRow({
  id,
  name,
  type,
  visible,
  onPress,
  onToggleVisibility,
  onDelete,
  onHide,
}: BlockRowProps) {
  const swipeableRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const typeInfo = BLOCK_TYPE_ICONS[type] ?? { icon: '\u{1F4E6}', color: colors.muted };

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    Animated.timing(opacityAnim, {
      toValue: 0.7,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  const handleToggleVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleVisibility?.();
  }, [onToggleVisibility]);

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <Pressable
        style={[styles.actionBtn, styles.hideAction]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onHide?.();
          swipeableRef.current?.close();
        }}
      >
        <Text style={styles.actionIcon}>
          {visible ? '\u{1F441}' : '\u{1F648}'}
        </Text>
        <Text style={styles.actionLabel}>
          {visible ? 'Hide' : 'Show'}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.actionBtn, styles.deleteAction]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onDelete?.();
          swipeableRef.current?.close();
        }}
      >
        <Text style={styles.actionIcon}>{'\u{1F5D1}'}</Text>
        <Text style={styles.actionLabel}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Animated.View
        style={[
          styles.wrapper,
          {
            transform: [{ scale: scaleAnim }],
            opacity: Animated.multiply(
              opacityAnim,
              visible ? new Animated.Value(1) : new Animated.Value(0.55),
            ),
          },
        ]}
      >
        <Pressable
          style={styles.container}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Type icon (colored circle) */}
          <View
            style={[styles.iconCircle, { backgroundColor: typeInfo.color + '1A' }]}
          >
            <Text style={styles.iconText}>{typeInfo.icon}</Text>
          </View>

          {/* Name + type badge */}
          <View style={styles.info}>
            <Text style={styles.blockName} numberOfLines={1}>
              {name}
            </Text>
            <View
              style={[styles.typeBadge, { backgroundColor: typeInfo.color + '15' }]}
            >
              <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                {type}
              </Text>
            </View>
          </View>

          {/* Visibility toggle */}
          <Pressable
            onPress={handleToggleVisibility}
            style={styles.visibilityBtn}
            hitSlop={12}
          >
            <Text style={styles.visibilityIcon}>
              {visible ? '\u{1F441}' : '\u{1F441}\u200D\u{1F5E8}'}
            </Text>
          </Pressable>

          {/* Drag handle (grip dots) */}
          <View style={styles.dragHandle}>
            <View style={styles.gripDots}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={styles.gripRow}>
                  <View style={styles.gripDot} />
                  <View style={styles.gripDot} />
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.white,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  blockName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.ink,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  visibilityBtn: {
    padding: spacing.xs,
  },
  visibilityIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  dragHandle: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  gripDots: {
    gap: 3,
  },
  gripRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted + '66',
  },
  rightActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    paddingVertical: spacing.md,
  },
  hideAction: {
    backgroundColor: colors.gold,
  },
  deleteAction: {
    backgroundColor: colors.danger,
  },
  actionIcon: {
    fontSize: 18,
    color: colors.white,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '600',
    marginTop: 2,
  },
});

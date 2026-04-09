import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import type { VibeOption } from '@/lib/types';

/** @deprecated Use VibeOption from @/lib/types instead */
export type Vibe = VibeOption;

const VIBES: VibeOption[] = [
  'romantic',
  'modern',
  'rustic',
  'playful',
  'elegant',
  'boho',
  'celestial',
  'tropical',
  'vintage',
  'minimalist',
];

interface VibeChipsProps {
  selected: VibeOption[];
  onToggle: (vibe: VibeOption) => void;
}

function Chip({
  label,
  isSelected,
  onPress,
}: {
  label: VibeOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Spring scale animation on press
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 80,
        bounciness: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 12,
      }),
    ]).start();

    onPress();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          isSelected ? styles.chipSelected : styles.chipUnselected,
        ]}
      >
        <Text
          style={[
            styles.chipText,
            isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function VibeChips({ selected, onToggle }: VibeChipsProps) {
  return (
    <View style={styles.container}>
      {VIBES.map((vibe) => (
        <Chip
          key={vibe}
          label={vibe}
          isSelected={selected.includes(vibe)}
          onPress={() => onToggle(vibe)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  chipSelected: {
    backgroundColor: colors.olive,
    borderColor: colors.olive,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderColor: colors.olive + '40',
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: colors.white,
  },
  chipTextUnselected: {
    color: colors.oliveDeep,
  },
});

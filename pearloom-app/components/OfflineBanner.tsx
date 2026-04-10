import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, radius } from '@/lib/theme';

interface OfflineBannerProps {
  visible: boolean;
  hasPendingEdits?: boolean;
}

export default function OfflineBanner({ visible, hasPendingEdits }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <FontAwesome name="wifi" size={14} color={colors.white} />
      <Text style={styles.text}>
        No internet connection
        {hasPendingEdits ? ' — changes will sync when online' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.inkSoft,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.white,
  },
});

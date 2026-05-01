import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, fonts, spacing } from '@/lib/theme';

interface ColorPaletteProps {
  palette: string[];
  size?: number;
  showLabels?: boolean;
  labels?: string[];
}

export default function ColorPalette({
  palette,
  size = 32,
  showLabels = false,
  labels,
}: ColorPaletteProps) {
  return (
    <View style={styles.container}>
      {palette.slice(0, 5).map((color, index) => (
        <View key={`${color}-${index}`} style={styles.swatchWrapper}>
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: color,
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          />
          {showLabels && (
            <Text style={styles.label} numberOfLines={1}>
              {labels?.[index] ?? color.toUpperCase()}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatchWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.muted,
    maxWidth: 44,
    textAlign: 'center',
  },
});

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors, fonts, spacing, radius } from '@/lib/theme';

interface NativeEventCardProps {
  name: string;
  date?: string;
  time?: string;
  venue?: string;
  address?: string;
  dressCode?: string;
  accentColor?: string;
  cardBackground?: string;
}

export default function NativeEventCard({
  name,
  date,
  time,
  venue,
  address,
  dressCode,
  accentColor = colors.olive,
  cardBackground = colors.white,
}: NativeEventCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 16,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formattedDate = date ? formatDate(date) : null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderLeftColor: accentColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Event name */}
      <Text style={styles.eventName} numberOfLines={2}>
        {name}
      </Text>

      {/* Date + time row */}
      {(formattedDate || time) && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{'\u{1F4C5}'}</Text>
          <Text style={styles.infoText}>
            {formattedDate}
            {formattedDate && time ? ' \u00B7 ' : ''}
            {time}
          </Text>
        </View>
      )}

      {/* Venue */}
      {venue && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{'\u{1F4CD}'}</Text>
          <View style={styles.venueCol}>
            <Text style={styles.infoText} numberOfLines={1}>
              {venue}
            </Text>
            {address ? (
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Dress code badge */}
      {dressCode ? (
        <View style={[styles.dressCodeBadge, { backgroundColor: accentColor + '1A' }]}>
          <Text style={[styles.dressCodeText, { color: accentColor }]}>
            {dressCode}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  eventName: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  venueCol: {
    flex: 1,
  },
  addressText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  dressCodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  dressCodeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

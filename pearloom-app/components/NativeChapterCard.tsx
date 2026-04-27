import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors, fonts, spacing, radius } from '@/lib/theme';

interface NativeChapterCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  photoUrl?: string;
  date?: string;
  mood?: string;
  accentColor?: string;
}

export default function NativeChapterCard({
  title,
  subtitle,
  description,
  photoUrl,
  date,
  mood,
  accentColor = colors.olive,
}: NativeChapterCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 16,
        stiffness: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formattedDate = date ? formatChapterDate(date) : null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Photo thumbnail */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: accentColor + '22' }]}>
          <Text style={[styles.photoPlaceholderText, { color: accentColor }]}>
            {'\u{1F4F7}'}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Title + subtitle */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        {/* Description */}
        {description ? (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        ) : null}

        {/* Meta row: date badge + mood label */}
        <View style={styles.metaRow}>
          {formattedDate && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          )}
          {mood ? (
            <View style={[styles.moodBadge, { backgroundColor: accentColor + '1A' }]}>
              <Text style={[styles.moodText, { color: accentColor }]}>
                {mood}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function formatChapterDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
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
  photo: {
    width: 100,
    height: '100%',
    minHeight: 120,
  },
  photoPlaceholder: {
    width: 100,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.ink,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  dateBadge: {
    backgroundColor: colors.creamDeep,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  dateText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.inkSoft,
  },
  moodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  moodText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});

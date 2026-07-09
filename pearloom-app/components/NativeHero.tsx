import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NativeHeroProps {
  coupleNames: string;
  date?: string;
  tagline?: string;
  coverPhotoUrl?: string;
  backgroundColor?: string;
  accentColor?: string;
  textColor?: string;
}

export default function NativeHero({
  coupleNames,
  date,
  tagline,
  coverPhotoUrl,
  backgroundColor = colors.olive,
  accentColor = colors.gold,
  textColor = colors.white,
}: NativeHeroProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const dateFade = useRef(new Animated.Value(0)).current;
  const dateSlide = useRef(new Animated.Value(20)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 14,
          stiffness: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(dateFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(dateSlide, {
          toValue: 0,
          damping: 14,
          stiffness: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formattedDate = date ? formatEventDate(date) : null;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <LinearGradient
        colors={[backgroundColor, adjustBrightness(backgroundColor, -20)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative accent line */}
      <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

      {/* Couple names */}
      <Animated.Text
        style={[
          styles.coupleNames,
          {
            color: textColor,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {coupleNames}
      </Animated.Text>

      {/* Date badge */}
      {formattedDate && (
        <Animated.View
          style={[
            styles.dateBadge,
            {
              backgroundColor: accentColor + '33',
              borderColor: accentColor + '55',
              opacity: dateFade,
              transform: [{ translateY: dateSlide }],
            },
          ]}
        >
          <Text style={[styles.dateText, { color: textColor }]}>
            {formattedDate}
          </Text>
        </Animated.View>
      )}

      {/* Tagline */}
      {tagline ? (
        <Animated.Text
          style={[
            styles.tagline,
            { color: textColor + 'CC', opacity: taglineFade },
          ]}
          numberOfLines={3}
        >
          {tagline}
        </Animated.Text>
      ) : null}

      {/* Bottom decorative dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: textColor + '44' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function adjustBrightness(hex: string, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const h = hex.replace('#', '');
  const r = clamp(parseInt(h.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(h.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  accentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: spacing.xl,
  },
  coupleNames: {
    fontFamily: fonts.heading,
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: 0.3,
    marginBottom: spacing.lg,
  },
  dateBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  dateText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { UserSite, RsvpStats } from '@/lib/types';

// Design tokens
const CREAM = '#FAF7F2';
const OLIVE = '#A3B18A';
const INK = '#1C1C1C';
const WARM_GRAY = '#8A8780';
const CARD_BG = '#FFFFFF';
const LIVE_GREEN = '#5A9A3C';
const DRAFT_AMBER = '#C9963B';

interface SiteCardProps {
  site: UserSite & {
    cover_photo_url?: string;
    event_date?: string;
    rsvpStats?: RsvpStats;
    is_live?: boolean;
  };
}

export default function SiteCard({ site }: SiteCardProps) {
  const router = useRouter();

  const coupleNames = site.names?.join(' & ') ?? 'Untitled Site';
  const isLive = site.is_live ?? false;
  const rsvp = site.rsvpStats;
  const eventDate = site.event_date
    ? formatDate(site.event_date)
    : null;

  // --- Animations ---
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rsvpBarAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // RSVP bar animates on mount
  useEffect(() => {
    if (rsvp && rsvp.total > 0) {
      rsvpBarAnim.setValue(0);
      Animated.timing(rsvpBarAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [rsvp]);

  // Pulse animation for Live badge
  useEffect(() => {
    if (isLive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLive]);

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/edit?siteId=${site.id}`);
  }

  const rsvpPct = rsvp && rsvp.total > 0
    ? Math.min(100, Math.round((rsvp.attending / rsvp.total) * 100))
    : 0;

  const animatedWidth = rsvpBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${rsvpPct}%`],
  });

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Cover photo or gradient placeholder */}
        <View style={styles.coverContainer}>
          {site.cover_photo_url ? (
            <Image
              source={{ uri: site.cover_photo_url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#D4C5A9', '#A3B18A', '#8B9D77']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            >
              <Text style={styles.placeholderInitials}>
                {site.names?.[0]?.[0] ?? ''}
                {site.names?.[1]?.[0] ? ` & ${site.names[1][0]}` : ''}
              </Text>
            </LinearGradient>
          )}

          {/* Gradient overlay on cover */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)']}
            style={styles.coverOverlay}
          />
        </View>

        {/* Status badge overlaid on cover */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isLive ? LIVE_GREEN : DRAFT_AMBER },
          ]}
        >
          <Animated.View
            style={[
              styles.statusDot,
              { backgroundColor: '#FFFFFF', opacity: isLive ? pulseAnim : 1 },
            ]}
          />
          <Text style={styles.statusText}>{isLive ? 'Live' : 'Draft'}</Text>
        </View>

        {/* Card body */}
        <View style={styles.cardBody}>
          {/* Couple names */}
          <Text style={styles.coupleNames} numberOfLines={1}>
            {coupleNames}
          </Text>

          {/* Event date */}
          {eventDate && (
            <Text style={styles.eventDate}>{eventDate}</Text>
          )}

          {/* RSVP progress */}
          {rsvp && rsvp.total > 0 && (
            <View style={styles.rsvpRow}>
              <View style={styles.rsvpBarTrack}>
                <Animated.View
                  style={[
                    styles.rsvpBarFill,
                    { width: animatedWidth },
                  ]}
                />
              </View>
              <Text style={styles.rsvpText}>
                {rsvp.attending}/{rsvp.total} RSVPed
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 160,
  },
  placeholderInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 16,
  },
  coupleNames: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: WARM_GRAY,
    marginBottom: 12,
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rsvpBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0EDE7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rsvpBarFill: {
    height: '100%',
    backgroundColor: OLIVE,
    borderRadius: 3,
  },
  rsvpText: {
    fontSize: 12,
    fontWeight: '600',
    color: WARM_GRAY,
    minWidth: 80,
    textAlign: 'right',
  },
});

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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

  function handlePress() {
    router.push(`/edit?siteId=${site.id}`);
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Cover photo or gradient placeholder */}
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

      {/* Status badge overlaid on cover */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: isLive ? LIVE_GREEN : DRAFT_AMBER },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isLive ? '#FFFFFF' : '#FFFFFF' },
          ]}
        />
        <Text style={styles.statusText}>{isLive ? 'Live' : 'Draft'}</Text>
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        {/* Couple names — use serif when font loaded */}
        {/* TODO: Replace fontFamily with 'Playfair Display' or similar serif when loaded */}
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
              <View
                style={[
                  styles.rsvpBarFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.round((rsvp.attending / rsvp.total) * 100)
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.rsvpText}>
              {rsvp.attending}/{rsvp.total} RSVPed
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInitials: {
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-Bold')
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
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-SemiBold')
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

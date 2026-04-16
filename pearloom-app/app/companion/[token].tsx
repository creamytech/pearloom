// ─────────────────────────────────────────────────────────────
// Pearloom Guest Companion
//
// The day-of experience — scanned in via QR on the invitation,
// or opened from /g/{token} on the web. Shows timeline, seat,
// announcements, and the live photo feed. No login required —
// the guest_token in the URL is the capability.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius, spacing } from '@/lib/theme';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://pearloom.com';

interface CompanionData {
  guest: {
    id: string;
    displayName: string;
    firstName: string;
    homeCity: string | null;
    dietary: string[] | null;
  };
  site: {
    id: string;
    subdomain: string;
    coupleNames: [string, string];
    venue: string | null;
    venueAddress: string | null;
    date: string | null;
    themeColors: Record<string, string> | null;
  };
  timeline: Array<{
    id: string;
    name: string;
    kind: string;
    startAt: string | null;
    endAt: string | null;
    dressCode: string | null;
    description: string | null;
  }>;
  seat: { seatLabel: string | null; tableLabel: string | null } | null;
  announcements: Array<{ id: string; body: string; kind: string; createdAt: string }>;
  photoFeed: Array<{ url: string; caption: string | null; createdAt: string }>;
  personalization: {
    hero_copy: string;
    seat_summary: string;
    travel_tips: {
      nearestAirport?: string;
      driveTime?: string;
      recommendedHotels?: Array<{ name: string; url?: string; note?: string }>;
    };
  } | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CompanionScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [data, setData] = useState<CompanionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/companion/${token}`);
      if (!res.ok) {
        setError(`Unable to load (${res.status})`);
        return;
      }
      const json = (await res.json()) as CompanionData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centerAll]}>
        <ActivityIndicator color={colors.olive} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.screen, styles.centerAll, { padding: spacing.xl }]}>
        <Text style={styles.errorText}>{error ?? 'No data available.'}</Text>
      </View>
    );
  }

  const { guest, site, timeline, seat, announcements, photoFeed, personalization } = data;
  const coupleLine = site.coupleNames.filter(Boolean).join(' & ');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.olive} />}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Hello, {guest.firstName}</Text>
        <Text style={styles.heroTitle}>{coupleLine}</Text>
        {site.date ? <Text style={styles.heroDate}>{formatDay(site.date)}</Text> : null}
        {site.venue ? <Text style={styles.heroVenue}>{site.venue}</Text> : null}
        {personalization?.hero_copy ? (
          <Text style={styles.heroCopy}>{personalization.hero_copy}</Text>
        ) : null}
      </View>

      {seat && (seat.seatLabel || seat.tableLabel) ? (
        <Section title="Your seat">
          <Text style={styles.seatLabel}>
            {seat.tableLabel ? `Table ${seat.tableLabel}` : ''}
            {seat.seatLabel ? ` · Seat ${seat.seatLabel}` : ''}
          </Text>
          {personalization?.seat_summary ? (
            <Text style={styles.bodyText}>{personalization.seat_summary}</Text>
          ) : null}
        </Section>
      ) : null}

      {timeline.length > 0 ? (
        <Section title="Timeline">
          {timeline.map((e) => (
            <View key={e.id} style={styles.timelineRow}>
              <Text style={styles.timelineTime}>{formatTime(e.startAt)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineName}>{e.name}</Text>
                {e.dressCode ? <Text style={styles.timelineMeta}>{e.dressCode}</Text> : null}
                {e.description ? <Text style={styles.timelineDesc}>{e.description}</Text> : null}
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {announcements.length > 0 ? (
        <Section title="Announcements">
          {announcements.map((a) => (
            <View key={a.id} style={styles.announcement}>
              <Text style={styles.announcementBody}>{a.body}</Text>
              <Text style={styles.timestamp}>{new Date(a.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {personalization?.travel_tips?.nearestAirport || personalization?.travel_tips?.recommendedHotels?.length ? (
        <Section title={`Getting here from ${guest.homeCity ?? 'home'}`}>
          {personalization?.travel_tips?.nearestAirport ? (
            <Text style={styles.bodyText}>
              Nearest airport: {personalization.travel_tips.nearestAirport}
              {personalization.travel_tips.driveTime ? ` — ${personalization.travel_tips.driveTime}` : ''}
            </Text>
          ) : null}
          {(personalization?.travel_tips?.recommendedHotels ?? []).map((h, i) => (
            <Pressable
              key={i}
              onPress={() => h.url && Linking.openURL(h.url)}
              style={styles.hotelRow}
            >
              <Text style={styles.hotelName}>{h.name}</Text>
              {h.note ? <Text style={styles.hotelNote}>{h.note}</Text> : null}
            </Pressable>
          ))}
        </Section>
      ) : null}

      {photoFeed.length > 0 ? (
        <Section title="Live feed">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {photoFeed.slice(0, 20).map((p, i) => (
              <Image
                key={i}
                source={{ uri: p.url }}
                style={styles.photoThumb}
              />
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Pressable
        onPress={() => Linking.openURL(`${API_BASE}/sites/${site.subdomain}`)}
        style={styles.viewSiteBtn}
      >
        <Text style={styles.viewSiteText}>Open the full site →</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.creamDeep,
  },
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  hero: {
    padding: spacing.xl,
    paddingTop: spacing.xxl + spacing.xl,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.ink,
    textAlign: 'center',
  },
  heroDate: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.inkSoft,
  },
  heroVenue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  heroCopy: {
    marginTop: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: 500,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  seatLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 20,
    color: colors.olive,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  timelineRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  timelineTime: {
    width: 80,
    fontFamily: fonts.bodyMedium,
    color: colors.olive,
    fontSize: 14,
  },
  timelineName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.ink,
  },
  timelineMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  timelineDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 4,
    lineHeight: 18,
  },
  announcement: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  announcementBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  timestamp: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  hotelRow: {
    paddingVertical: spacing.sm,
  },
  hotelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.plum,
  },
  hotelNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  photoThumb: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.creamDeep,
  },
  viewSiteBtn: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.olive,
    alignItems: 'center',
  },
  viewSiteText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.oliveDeep,
  },
});

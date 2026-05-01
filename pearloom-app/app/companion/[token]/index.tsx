// ─────────────────────────────────────────────────────────────
// Pearloom / companion/[token]/index.tsx  (Home tab)
//
// Hero + seat + announcements + travel tips + "open full site".
// The photo feed and timeline moved to their own tabs.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { API_BASE, useCompanion } from './_context';

function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CompanionHome() {
  const { data, loading, refreshing, error, refresh } = useCompanion();

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

  const { guest, site, seat, announcements, personalization } = data;
  const coupleLine = site.coupleNames.filter(Boolean).join(' & ');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}
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
  screen: { flex: 1, backgroundColor: colors.creamDeep },
  centerAll: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontFamily: fonts.body, textAlign: 'center' },
  hero: { padding: spacing.xl, paddingTop: spacing.xxl + spacing.xl, alignItems: 'center' },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  heroTitle: { fontFamily: fonts.heading, fontSize: 32, color: colors.ink, textAlign: 'center' },
  heroDate: { marginTop: spacing.sm, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft },
  heroVenue: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
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
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink, padding: spacing.lg, paddingBottom: spacing.sm },
  sectionBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  seatLabel: { fontFamily: fonts.bodySemibold, fontSize: 20, color: colors.olive, marginBottom: spacing.sm },
  bodyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.inkSoft },
  announcement: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  announcementBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  timestamp: { marginTop: 4, fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  hotelRow: { paddingVertical: spacing.sm },
  hotelName: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.plum },
  hotelNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  viewSiteBtn: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.olive,
    alignItems: 'center',
  },
  viewSiteText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.oliveDeep },
});

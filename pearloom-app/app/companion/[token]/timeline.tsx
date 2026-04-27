// ─────────────────────────────────────────────────────────────
// Pearloom / companion/[token]/timeline.tsx
// Day-of timeline, minute-by-minute.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { useCompanion } from './_context';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function CompanionTimeline() {
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
  const { timeline } = data;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}
    >
      <Text style={styles.heading}>Timeline</Text>

      {timeline.length === 0 ? (
        <Text style={styles.emptyText}>The couple will share the schedule soon.</Text>
      ) : (
        <View style={styles.card}>
          {timeline.map((e, idx) => (
            <View
              key={e.id}
              style={[
                styles.row,
                idx === timeline.length - 1 ? { borderBottomWidth: 0 } : null,
              ]}
            >
              <Text style={styles.time}>{formatTime(e.startAt)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{e.name}</Text>
                {e.dressCode ? <Text style={styles.meta}>{e.dressCode}</Text> : null}
                {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creamDeep },
  centerAll: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontFamily: fonts.body, textAlign: 'center' },
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.ink, marginBottom: spacing.lg, marginTop: spacing.lg },
  emptyText: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, textAlign: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  time: { width: 80, fontFamily: fonts.bodyMedium, color: colors.olive, fontSize: 14 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 4, lineHeight: 18 },
});

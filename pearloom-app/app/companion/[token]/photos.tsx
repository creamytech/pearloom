// ─────────────────────────────────────────────────────────────
// Pearloom / companion/[token]/photos.tsx
// Live photo feed for the event — scroll as more show up.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { useCompanion } from './_context';

export default function CompanionPhotos() {
  const { data, loading, refreshing, error, refresh } = useCompanion();
  const { width } = useWindowDimensions();

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

  const { photoFeed } = data;
  const tile = Math.max(120, Math.floor((width - spacing.lg * 3) / 2));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}
    >
      <Text style={styles.heading}>Live photo feed</Text>
      <Text style={styles.subheading}>
        {photoFeed.length} photo{photoFeed.length === 1 ? '' : 's'} shared so far — pull to refresh.
      </Text>

      {photoFeed.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No photos yet. The feed updates in real-time as guests upload.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photoFeed.map((p, i) => (
            <View key={`${p.url}-${i}`} style={[styles.tile, { width: tile, height: tile }]}>
              <Image source={{ uri: p.url }} style={styles.img} />
              {p.caption ? (
                <View style={styles.captionScrim}>
                  <Text style={styles.caption} numberOfLines={2}>{p.caption}</Text>
                </View>
              ) : null}
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
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.ink, marginTop: spacing.lg },
  subheading: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: spacing.xs, marginBottom: spacing.lg },
  empty: { padding: spacing.xl, backgroundColor: colors.white, borderRadius: radius.lg, alignItems: 'center' },
  emptyText: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.white },
  img: { width: '100%', height: '100%' },
  captionScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caption: { color: colors.white, fontFamily: fonts.body, fontSize: 11 },
});

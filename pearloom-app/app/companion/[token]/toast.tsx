// ─────────────────────────────────────────────────────────────
// Pearloom / companion/[token]/toast.tsx
//
// "Leave them a voice toast" tab. Native recording in Expo
// requires expo-audio which isn't yet in this project. For now
// we deep-link to the web recorder (the MediaRecorder flow on
// /g/{token}) which is already production-ready.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { API_BASE, useCompanion } from './_context';

export default function CompanionToast() {
  const { token } = useCompanion();
  const recorderUrl = `${API_BASE}/g/${token}#voice-toast`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}
    >
      <Text style={styles.heading}>Leave a toast</Text>
      <Text style={styles.subheading}>
        Record up to two minutes. Your words could end up in the anniversary film.
      </Text>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconGlyph}>🎙️</Text>
        </View>
        <Text style={styles.cardTitle}>Record in the browser</Text>
        <Text style={styles.cardBody}>
          We use your device's browser for the best microphone support. Tap below to open the
          recorder — come right back when you're done.
        </Text>

        <Pressable
          onPress={() => Linking.openURL(recorderUrl)}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Open the recorder →</Text>
        </Pressable>
      </View>

      <Text style={styles.fineprint}>
        The couple reviews every toast before anything is added to the film — nothing is public by default.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creamDeep },
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.ink, marginTop: spacing.lg },
  subheading: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconGlyph: { fontSize: 30 },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.olive,
    borderRadius: radius.full,
  },
  primaryBtnText: { color: colors.white, fontFamily: fonts.bodySemibold, fontSize: 14 },
  fineprint: {
    marginTop: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
});

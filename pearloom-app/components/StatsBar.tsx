import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';

// Design tokens
const OLIVE = '#A3B18A';
const INK = '#1C1C1C';
const WARM_GRAY = '#8A8780';

interface StatsBarProps {
  totalViews: number;
  totalAttending: number;
  upcomingEvents: number;
}

interface StatPillProps {
  label: string;
  value: string | number;
  icon: string;
}

function StatPill({ label, value, icon }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <View>
        <Text style={styles.pillValue}>{value}</Text>
        <Text style={styles.pillLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function StatsBar({
  totalViews,
  totalAttending,
  upcomingEvents,
}: StatsBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      <StatPill
        icon="👁"
        label="Total views"
        value={formatNumber(totalViews)}
      />
      <StatPill
        icon="🎉"
        label="Attending"
        value={formatNumber(totalAttending)}
      />
      <StatPill
        icon="📅"
        label="Upcoming"
        value={upcomingEvents}
      />
    </ScrollView>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    // Glass card effect
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    minWidth: 140,
  },
  pillIcon: {
    fontSize: 22,
  },
  pillValue: {
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-Bold')
    fontSize: 20,
    fontWeight: '700',
    color: INK,
    lineHeight: 24,
  },
  pillLabel: {
    fontSize: 12,
    color: WARM_GRAY,
    marginTop: 1,
  },
});

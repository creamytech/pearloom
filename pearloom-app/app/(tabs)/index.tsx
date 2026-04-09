import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SiteCard from '@/components/SiteCard';
import StatsBar from '@/components/StatsBar';
import { getSites } from '@/lib/api'; // May not exist yet
import type { UserSite, RsvpStats } from '@/lib/types';

// Design tokens
const CREAM = '#FAF7F2';
const OLIVE = '#A3B18A';
const OLIVE_LIGHT = '#C8D5B9';
const INK = '#1C1C1C';
const WARM_GRAY = '#8A8780';

// Extended site type with dashboard-specific fields
type DashboardSite = UserSite & {
  cover_photo_url?: string;
  event_date?: string;
  rsvpStats?: RsvpStats;
  is_live?: boolean;
};

export default function HomeScreen() {
  const router = useRouter();
  const [sites, setSites] = useState<DashboardSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual user data from auth context
  const userName = 'Sarah';

  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      const data = await getSites();
      setSites(data as DashboardSite[]);
    } catch (err) {
      setError('Could not load your sites. Pull down to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSites();
  }, [fetchSites]);

  function handleNewSite() {
    router.push('/wizard');
  }

  // Compute aggregate stats
  const totalViews = sites.reduce(
    (sum, s) => sum + ((s as any).analytics?.total_views ?? 0),
    0
  );
  const totalAttending = sites.reduce(
    (sum, s) => sum + (s.rsvpStats?.attending ?? 0),
    0
  );
  const upcomingEvents = sites.filter((s) => {
    if (!s.event_date) return false;
    return new Date(s.event_date) >= new Date();
  }).length;

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // --- Loading state ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={CREAM} />
        <View style={styles.loadingContainer}>
          {/* Skeleton header */}
          <View style={styles.skeletonHeader}>
            <View style={[styles.skeletonBlock, { width: 200, height: 28 }]} />
            <View
              style={[
                styles.skeletonBlock,
                { width: 100, height: 40, borderRadius: 12 },
              ]}
            />
          </View>

          {/* Skeleton stats bar */}
          <View style={styles.skeletonStatsRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonStatPill} />
            ))}
          </View>

          {/* Skeleton cards */}
          {[1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonCardImage} />
              <View style={styles.skeletonCardBody}>
                <View
                  style={[styles.skeletonBlock, { width: '70%', height: 18 }]}
                />
                <View
                  style={[
                    styles.skeletonBlock,
                    { width: '50%', height: 14, marginTop: 8 },
                  ]}
                />
              </View>
            </View>
          ))}

          <ActivityIndicator
            size="small"
            color={OLIVE}
            style={styles.spinner}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={CREAM} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={OLIVE}
            colors={[OLIVE]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {userName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {sites.length > 0
                ? `You have ${sites.length} site${sites.length !== 1 ? 's' : ''}`
                : 'Let\u2019s get started'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newSiteButton}
            onPress={handleNewSite}
            activeOpacity={0.85}
          >
            <FontAwesome name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.newSiteButtonText}>New Site</Text>
          </TouchableOpacity>
        </View>

        {/* --- Error state --- */}
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={16} color="#C0392B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- Empty state --- */}
        {!error && sites.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>✦</Text>
            </View>
            {/* TODO: Replace with serif font */}
            <Text style={styles.emptyHeading}>
              Create your first site
            </Text>
            <Text style={styles.emptySubtext}>
              Design a beautiful AI-powered celebration site in minutes.
            </Text>
            <TouchableOpacity
              style={styles.emptyCTA}
              onPress={handleNewSite}
              activeOpacity={0.85}
            >
              <FontAwesome name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.emptyCTAText}>New Site</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- Stats bar (only if sites exist) --- */}
        {sites.length > 0 && (
          <StatsBar
            totalViews={totalViews}
            totalAttending={totalAttending}
            upcomingEvents={upcomingEvents}
          />
        )}

        {/* --- Site cards --- */}
        {sites.length > 0 && (
          <View style={styles.cardsContainer}>
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollView: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
    paddingBottom: 20,
  },
  greeting: {
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-SemiBold')
    fontSize: 24,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: WARM_GRAY,
    marginTop: 2,
  },
  newSiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: OLIVE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  newSiteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Error ---
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FDF0EF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5DADA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#6B2020',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: OLIVE,
  },

  // --- Empty state ---
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: OLIVE_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 32,
    color: OLIVE,
  },
  emptyHeading: {
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-SemiBold')
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: WARM_GRAY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: OLIVE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCTAText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Cards ---
  cardsContainer: {
    paddingHorizontal: 20,
  },

  // --- Loading / Skeleton ---
  loadingContainer: {
    flex: 1,
    backgroundColor: CREAM,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonBlock: {
    backgroundColor: '#EDE9E2',
    borderRadius: 8,
    height: 16,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  skeletonStatPill: {
    width: 140,
    height: 60,
    backgroundColor: '#EDE9E2',
    borderRadius: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  skeletonCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#EDE9E2',
  },
  skeletonCardBody: {
    padding: 16,
  },
  spinner: {
    marginTop: 20,
  },
});

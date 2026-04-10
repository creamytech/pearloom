import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SiteCard from '@/components/SiteCard';
import StatsBar from '@/components/StatsBar';
import OfflineBanner from '@/components/OfflineBanner';
import { getSites, apiFetch } from '@/lib/api';
import { useNetworkStatus, cacheSites, getCachedSites } from '@/lib/offline';
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
  const { isOnline } = useNetworkStatus();
  const [sites, setSites] = useState<DashboardSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  // TODO: Replace with actual user data from auth context
  const userName = 'Sarah';

  // ── Animation values ───────────────────────────────────────────────────
  const greetingFade = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(16)).current;
  const statsScale = useRef(new Animated.Value(0.85)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const newSiteScale = useRef(new Animated.Value(1)).current;

  // Card stagger animations — allocate enough for a reasonable max
  const MAX_CARDS = 20;
  const cardFades = useRef(
    Array.from({ length: MAX_CARDS }, () => new Animated.Value(0))
  ).current;
  const cardSlides = useRef(
    Array.from({ length: MAX_CARDS }, () => new Animated.Value(30))
  ).current;

  // ── Mount animations ───────────────────────────────────────────────────
  const runEntryAnimations = useCallback(
    (siteCount: number) => {
      // Greeting fade in
      Animated.parallel([
        Animated.timing(greetingFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(greetingSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Stats bar spring in (delayed slightly)
      Animated.parallel([
        Animated.spring(statsScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered card animations
      const cardAnims: Animated.CompositeAnimation[] = [];
      const count = Math.min(siteCount, MAX_CARDS);
      for (let i = 0; i < count; i++) {
        cardFades[i].setValue(0);
        cardSlides[i].setValue(30);
        cardAnims.push(
          Animated.parallel([
            Animated.timing(cardFades[i], {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(cardSlides[i], {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      }
      Animated.stagger(100, cardAnims).start();
    },
    [greetingFade, greetingSlide, statsScale, statsOpacity, cardFades, cardSlides]
  );

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      const data = await getSites();
      setSites(data as DashboardSite[]);
      cacheSites(data);
      return (data as DashboardSite[]).length;
    } catch (err) {
      // Attempt to load cached sites when offline
      const cached = await getCachedSites();
      if (cached.length > 0) {
        setSites(cached as DashboardSite[]);
        return cached.length;
      }
      setError('Could not load your sites. Pull down to try again.');
      return 0;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSites().then((count) => {
      runEntryAnimations(count);
    });
  }, [fetchSites, runEntryAnimations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSites().then((count) => {
      runEntryAnimations(count);
    });
  }, [fetchSites, runEntryAnimations]);

  // ── New Site button press animation ────────────────────────────────────
  function onNewSitePressIn() {
    Animated.spring(newSiteScale, {
      toValue: 0.92,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }

  function onNewSitePressOut() {
    Animated.spring(newSiteScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }

  function handleNewSite() {
    router.push('/wizard');
  }

  function handleFromTemplate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/marketplace');
  }

  function onFabPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Create Site', 'How would you like to get started?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'From Template', onPress: handleFromTemplate },
      { text: 'New Site', onPress: handleNewSite },
    ]);
  }

  function onFabPressIn() {
    Animated.spring(fabScale, {
      toValue: 0.88,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }

  function onFabPressOut() {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
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

  function handleLongPressSite(site: DashboardSite) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      site.names?.join(' & ') ?? 'Site',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Site',
          style: 'destructive',
          onPress: () => confirmDeleteSite(site),
        },
      ],
    );
  }

  function confirmDeleteSite(site: DashboardSite) {
    Alert.alert(
      'Are you sure?',
      `This will permanently delete "${site.names?.join(' & ') ?? 'this site'}". This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/sites/${site.id}`, { method: 'DELETE' });
              setSites((prev) => prev.filter((s) => s.id !== site.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete site. Please try again.');
            }
          },
        },
      ],
    );
  }

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
      <OfflineBanner visible={!isOnline} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={OLIVE}
            colors={[OLIVE]}
            progressBackgroundColor={CREAM}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header --- */}
        <View style={styles.header}>
          <Animated.View
            style={{
              opacity: greetingFade,
              transform: [{ translateY: greetingSlide }],
            }}
          >
            <Text style={styles.greeting}>
              {getGreeting()}, {userName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {sites.length > 0
                ? `You have ${sites.length} site${sites.length !== 1 ? 's' : ''}`
                : 'Let\u2019s get started'}
            </Text>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: newSiteScale }] }}>
            <Pressable
              style={styles.newSiteButton}
              onPress={handleNewSite}
              onPressIn={onNewSitePressIn}
              onPressOut={onNewSitePressOut}
            >
              <FontAwesome name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.newSiteButtonText}>New Site</Text>
            </Pressable>
          </Animated.View>
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
          <Animated.View
            style={[
              styles.emptyState,
              {
                opacity: greetingFade,
                transform: [{ translateY: greetingSlide }],
              },
            ]}
          >
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>✦</Text>
            </View>
            <Text style={styles.emptyHeading}>
              Create your first site
            </Text>
            <Text style={styles.emptySubtext}>
              Design a beautiful AI-powered celebration site in minutes.
            </Text>
            <Animated.View style={{ transform: [{ scale: newSiteScale }] }}>
              <Pressable
                style={styles.emptyCTA}
                onPress={handleNewSite}
                onPressIn={onNewSitePressIn}
                onPressOut={onNewSitePressOut}
              >
                <FontAwesome name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.emptyCTAText}>New Site</Text>
              </Pressable>
            </Animated.View>
            <Pressable style={styles.templateCTA} onPress={handleFromTemplate}>
              <FontAwesome name="shopping-bag" size={14} color={OLIVE} />
              <Text style={styles.templateCTAText}>From Template</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* --- Stats bar (only if sites exist) --- */}
        {sites.length > 0 && (
          <Animated.View
            style={{
              opacity: statsOpacity,
              transform: [{ scale: statsScale }],
            }}
          >
            <StatsBar
              totalViews={totalViews}
              totalAttending={totalAttending}
              upcomingEvents={upcomingEvents}
            />
          </Animated.View>
        )}

        {/* --- Site cards with staggered animation --- */}
        {sites.length > 0 && (
          <View style={styles.cardsContainer}>
            {sites.map((site, index) => (
              <Animated.View
                key={site.id}
                style={{
                  opacity: index < MAX_CARDS ? cardFades[index] : 1,
                  transform: [
                    {
                      translateY:
                        index < MAX_CARDS ? cardSlides[index] : 0,
                    },
                  ],
                }}
              >
                <Pressable onLongPress={() => handleLongPressSite(site)} delayLongPress={500}>
                  <SiteCard site={site} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {sites.length > 0 && (
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
          <Pressable
            style={styles.fabInner}
            onPress={onFabPress}
            onPressIn={onFabPressIn}
            onPressOut={onFabPressOut}
          >
            <FontAwesome name="plus" size={22} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
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
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 24,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
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
    fontFamily: 'Inter_600SemiBold',
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

  // --- Template CTA ---
  templateCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: OLIVE,
  },
  templateCTAText: {
    fontFamily: 'Inter_600SemiBold',
    color: OLIVE,
    fontSize: 16,
    fontWeight: '600',
  },

  // --- FAB ---
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 100,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: OLIVE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

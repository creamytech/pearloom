import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, spacing, radius } from '@/lib/theme';
import { getGuests, getRsvpStats, getSites, apiFetch } from '@/lib/api';
import type { Guest, RsvpStats, UserSite } from '@/lib/types';
import RsvpRing from '@/components/RsvpRing';
import GuestRow from '@/components/GuestRow';

// ── Types ──────────────────────────────────────────────────────────────

interface GuestSection {
  title: string;
  data: Guest[];
}

// ── Component ──────────────────────────────────────────────────────────

export default function GuestsScreen() {
  const router = useRouter();

  // Sites
  const [sites, setSites] = useState<UserSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showSitePicker, setShowSitePicker] = useState(false);

  // Data
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<RsvpStats>({
    attending: 0,
    declined: 0,
    pending: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBorderAnim = useRef(new Animated.Value(0)).current;

  // FAB animation
  const fabScaleAnim = useRef(new Animated.Value(0)).current;

  // ── Search focus animation ───────────────────────────────────────────

  useEffect(() => {
    Animated.timing(searchBorderAnim, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  const searchBorderColor = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.creamDeep, colors.olive],
  });

  const searchShadowOpacity = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  // ── FAB bounce animation on mount ────────────────────────────────────

  useEffect(() => {
    Animated.spring(fabScaleAnim, {
      toValue: 1,
      damping: 10,
      stiffness: 150,
      mass: 0.8,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Fetch sites on mount ─────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const fetchedSites = await getSites();
        setSites(fetchedSites);
        if (fetchedSites.length > 0 && !selectedSiteId) {
          setSelectedSiteId(fetchedSites[0].id);
        }
      } catch (err) {
        console.error('Failed to load sites:', err);
      }
    })();
  }, []);

  // ── Fetch guests & stats when site changes ───────────────────────────

  const fetchData = useCallback(async () => {
    if (!selectedSiteId) {
      setLoading(false);
      return;
    }

    try {
      const [guestList, rsvpStats] = await Promise.all([
        getGuests(selectedSiteId),
        getRsvpStats(selectedSiteId),
      ]);
      setGuests(guestList);
      setStats(rsvpStats);
    } catch (err) {
      console.error('Failed to load guests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }, [fetchData]);

  // ── Filtered & sectioned data ────────────────────────────────────────

  const filteredGuests = useMemo(() => {
    if (!search.trim()) return guests;
    const q = search.toLowerCase();
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.email && g.email.toLowerCase().includes(q)),
    );
  }, [guests, search]);

  const sections: GuestSection[] = useMemo(() => {
    const attending = filteredGuests.filter(
      (g) => g.rsvp_status === 'attending',
    );
    const pending = filteredGuests.filter(
      (g) => g.rsvp_status === 'pending',
    );
    const declined = filteredGuests.filter(
      (g) => g.rsvp_status === 'declined',
    );

    const result: GuestSection[] = [];
    if (attending.length > 0) result.push({ title: 'Attending', data: attending });
    if (pending.length > 0) result.push({ title: 'Pending', data: pending });
    if (declined.length > 0) result.push({ title: 'Declined', data: declined });
    return result;
  }, [filteredGuests]);

  // ── Actions ──────────────────────────────────────────────────────────

  const updateGuestStatus = useCallback(
    async (guest: Guest, status: Guest['rsvp_status']) => {
      if (!selectedSiteId) return;
      try {
        await apiFetch(`/api/sites/${selectedSiteId}/guests/${guest.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ rsvp_status: status }),
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id ? { ...g, rsvp_status: status } : g,
          ),
        );
        // Update stats locally
        setStats((prev) => {
          const oldStatus = guest.rsvp_status;
          return {
            ...prev,
            [oldStatus]: Math.max(0, prev[oldStatus] - 1),
            [status]: prev[status] + 1,
          };
        });
      } catch (err) {
        Alert.alert('Error', 'Failed to update guest status.');
      }
    },
    [selectedSiteId],
  );

  const deleteGuest = useCallback(
    (guest: Guest) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        'Delete Guest',
        `Remove ${guest.name} from the guest list?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (!selectedSiteId) return;
              try {
                await apiFetch(
                  `/api/sites/${selectedSiteId}/guests/${guest.id}`,
                  { method: 'DELETE' },
                );
                setGuests((prev) => prev.filter((g) => g.id !== guest.id));
                setStats((prev) => ({
                  ...prev,
                  [guest.rsvp_status]: Math.max(
                    0,
                    prev[guest.rsvp_status] - 1,
                  ),
                  total: Math.max(0, prev.total - 1),
                }));
              } catch (err) {
                Alert.alert('Error', 'Failed to delete guest.');
              }
            },
          },
        ],
      );
    },
    [selectedSiteId],
  );

  // ── Selected site label ──────────────────────────────────────────────

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const siteName = selectedSite
    ? `${selectedSite.names[0]} & ${selectedSite.names[1]}`
    : 'Select a site';

  // ── Render ───────────────────────────────────────────────────────────

  const renderSectionHeader = ({
    section,
  }: {
    section: GuestSection;
  }) => (
    <BlurView intensity={80} tint="light" style={styles.sectionHeaderBlur}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    </BlurView>
  );

  const renderItem = ({ item }: { item: Guest }) => (
    <GuestRow
      guest={item}
      onMarkAttending={(g) => updateGuestStatus(g, 'attending')}
      onMarkDeclined={(g) => updateGuestStatus(g, 'declined')}
      onDelete={deleteGuest}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIllustration}>
          <FontAwesome name="users" size={36} color={colors.olive + '44'} />
        </View>
        <Text style={styles.emptyTitle}>No guests yet</Text>
        <Text style={styles.emptySubtitle}>
          {search
            ? 'No guests match your search.'
            : 'Add your first guest to get started.'}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* RSVP Ring */}
      {stats.total > 0 && (
        <RsvpRing
          attending={stats.attending}
          declined={stats.declined}
          pending={stats.pending}
        />
      )}

      {/* Search bar with focus animation */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor: searchBorderColor,
            shadowColor: colors.olive,
            shadowOpacity: searchShadowOpacity,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <FontAwesome
          name="search"
          size={14}
          color={searchFocused ? colors.olive : colors.muted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guests..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearch('');
            }}
            hitSlop={8}
          >
            <FontAwesome name="times-circle" size={16} color={colors.muted} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Site selector (if multiple sites) */}
      {sites.length > 1 && (
        <View style={styles.sitePickerWrapper}>
          <Pressable
            style={styles.sitePicker}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSitePicker(!showSitePicker);
            }}
          >
            <Text style={styles.sitePickerLabel} numberOfLines={1}>
              {siteName}
            </Text>
            <FontAwesome
              name={showSitePicker ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.inkSoft}
            />
          </Pressable>

          {showSitePicker && (
            <View style={styles.siteDropdown}>
              {sites.map((site) => (
                <Pressable
                  key={site.id}
                  style={[
                    styles.siteOption,
                    site.id === selectedSiteId && styles.siteOptionActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedSiteId(site.id);
                    setShowSitePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.siteOptionText,
                      site.id === selectedSiteId &&
                        styles.siteOptionTextActive,
                    ]}
                  >
                    {site.names[0]} & {site.names[1]}
                  </Text>
                  {site.id === selectedSiteId && (
                    <FontAwesome
                      name="check"
                      size={14}
                      color={colors.olive}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.olive} />
        </View>
      ) : (
        <SectionList<Guest, GuestSection>
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.olive}
              colors={[colors.olive]}
            />
          }
        />
      )}

      {/* FAB: Add Guest with bounce animation */}
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ scale: fabScaleAnim }] },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert('Add Guest', 'Guest creation form coming soon.');
          }}
        >
          <FontAwesome name="plus" size={22} color={colors.white} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    paddingBottom: spacing.sm,
  },

  // Site picker
  sitePickerWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.cream,
    zIndex: 10,
  },
  sitePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.creamDeep,
  },
  sitePickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
    marginRight: spacing.sm,
  },
  siteDropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    overflow: 'hidden',
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  siteOptionActive: {
    backgroundColor: colors.olive + '10',
  },
  siteOptionText: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  siteOptionTextActive: {
    color: colors.olive,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
  },

  // Section headers with glass blur
  sectionHeaderBlur: {
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingTop: spacing.lg,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.cream,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.creamDeep,
    marginLeft: spacing.lg + 44 + spacing.md,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.olive + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.olive,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.92 }],
  },
});

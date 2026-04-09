import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import { colors, spacing, radius } from '@/lib/theme';
import { getSites } from '@/lib/api';
import type { UserSite } from '@/lib/types';

// ── Skeleton placeholder ───────────────────────────────────────────────

function SkeletonCard() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.cardInner}>
        <View style={skeletonStyles.textBlock}>
          <Animated.View style={[skeletonStyles.titleBar, { opacity }]} />
          <Animated.View style={[skeletonStyles.subtitleBar, { opacity }]} />
        </View>
        <Animated.View style={[skeletonStyles.circle, { opacity }]} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  textBlock: {
    flex: 1,
    gap: 8,
    backgroundColor: 'transparent',
  },
  titleBar: {
    width: '60%',
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.creamDeep,
  },
  subtitleBar: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.creamDeep,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.creamDeep,
    marginLeft: spacing.md,
  },
});

// ── Animated card row ──────────────────────────────────────────────────

function AnimatedSiteCard({
  item,
  onEdit,
}: {
  item: UserSite;
  onEdit: (id: string) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(item.id);
  }, [item.id, onEdit]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.cardBody}>
          <Text style={styles.siteName}>
            {item.names[0]} & {item.names[1]}
          </Text>
          <Text style={styles.siteDomain}>{item.domain}</Text>
        </View>
        <View style={styles.editBadge}>
          <FontAwesome name="pencil" size={16} color={colors.white} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function EditTabScreen() {
  const router = useRouter();
  const [sites, setSites] = useState<UserSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      const data = await getSites();
      setSites(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load sites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSites();
    }, [fetchSites]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSites();
  }, [fetchSites]);

  const handleEditSite = useCallback(
    (siteId: string) => {
      router.push(`/editor/${siteId}`);
    },
    [router],
  );

  // Loading skeleton state
  if (loading && sites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error && sites.length === 0) {
    return (
      <View style={styles.centered}>
        <FontAwesome
          name="exclamation-triangle"
          size={32}
          color={colors.muted}
        />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            fetchSites();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.olive}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <FontAwesome name="pencil-square-o" size={36} color={colors.olive + '55'} />
            </View>
            <Text style={styles.emptyTitle}>No sites yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a site on pearloom.com to start editing
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AnimatedSiteCard item={item} onEdit={handleEditSite} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.xl,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonList: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: 'transparent',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardBody: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  siteName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  siteDomain: {
    fontSize: 13,
    color: colors.muted,
  },
  editBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    backgroundColor: 'transparent',
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
    fontWeight: '600',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.olive,
    borderRadius: radius.md,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import { colors, spacing, radius } from '@/lib/theme';
import { getSites } from '@/lib/api';
import type { UserSite } from '@/lib/types';

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

  if (loading && sites.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.olive} />
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchSites}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
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
            <FontAwesome name="pencil-square-o" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No sites yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a site on pearloom.com to start editing
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleEditSite(item.id)}
            activeOpacity={0.7}
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
          </TouchableOpacity>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    // Shadow
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginTop: spacing.lg,
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
    borderRadius: radius.sm,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Animated,
  Share,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSite } from '@/lib/api';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import NativeHero from '@/components/NativeHero';
import NativeEventCard from '@/components/NativeEventCard';
import NativeChapterCard from '@/components/NativeChapterCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types for manifest blocks ─────────────────────────────────────────────

interface Block {
  id: string;
  type: string;
  title?: string;
  name?: string;
  visible?: boolean;
  config?: any;
  data?: any;
  [key: string]: any;
}

interface Manifest {
  blocks?: Block[];
  vibeSkin?: {
    palette?: string[];
    fontPair?: string;
  };
  theme?: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
  };
  couple?: {
    names?: [string, string];
    date?: string;
    tagline?: string;
  };
  [key: string]: any;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SitePreviewScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const router = useRouter();

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [coupleNames, setCoupleNames] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fabScale = useRef(new Animated.Value(0)).current;

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchSite = useCallback(async () => {
    try {
      setError(null);
      const site = await getSite(siteId!);
      const m = site.manifest as Manifest;
      setManifest(m);
      setCoupleNames(site.names?.join(' & ') ?? 'Your Wedding');
    } catch (err: any) {
      setError(err.message ?? 'Failed to load site');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  // Show FAB after load
  useEffect(() => {
    if (!loading && manifest) {
      Animated.spring(fabScale, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        delay: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, manifest]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchSite();
  }, [fetchSite]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://pearloom.com/s/${siteId}`;
    await Share.share({
      url,
      message: `Check out our wedding site: ${url}`,
    });
  }, [siteId]);

  const handleEditPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/editor/${siteId}`);
  }, [siteId, router]);

  // ── Theme extraction ──────────────────────────────────────────────────

  const palette = manifest?.vibeSkin?.palette ?? [];
  const themeColors = manifest?.theme?.colors;
  const primaryColor = palette[0] ?? themeColors?.primary ?? colors.olive;
  const accentColor = palette[1] ?? themeColors?.accent ?? colors.gold;
  const bgColor = palette[4] ?? themeColors?.background ?? colors.cream;
  const textColor = palette[3] ?? themeColors?.text ?? colors.ink;

  // ── Block rendering ───────────────────────────────────────────────────

  const blocks = (manifest?.blocks ?? []).filter(
    (b) => b.visible !== false,
  );

  const renderBlock = (block: Block, index: number) => {
    const key = block.id ?? `block-${index}`;
    const cfg = block.config ?? block.data ?? block;

    switch (block.type) {
      case 'hero':
        return (
          <NativeHero
            key={key}
            coupleNames={
              cfg.coupleNames ??
              manifest?.couple?.names?.join(' & ') ??
              coupleNames
            }
            date={cfg.date ?? manifest?.couple?.date}
            tagline={cfg.tagline ?? manifest?.couple?.tagline}
            coverPhotoUrl={cfg.coverPhoto ?? cfg.coverPhotoUrl}
            backgroundColor={primaryColor}
            accentColor={accentColor}
            textColor={colors.white}
          />
        );

      case 'story':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'Our Story'}
            </Text>
            {(cfg.chapters ?? []).map((chapter: any, ci: number) => (
              <NativeChapterCard
                key={chapter.id ?? `ch-${ci}`}
                title={chapter.title ?? ''}
                subtitle={chapter.subtitle}
                description={chapter.description ?? chapter.text}
                photoUrl={chapter.photo ?? chapter.photoUrl}
                date={chapter.date}
                mood={chapter.mood}
                accentColor={primaryColor}
              />
            ))}
            {(!cfg.chapters || cfg.chapters.length === 0) && (
              <Text style={styles.emptyText}>
                No story chapters yet
              </Text>
            )}
          </View>
        );

      case 'events':
      case 'event':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'Events'}
            </Text>
            {(cfg.events ?? (cfg.name ? [cfg] : [])).map(
              (event: any, ei: number) => (
                <NativeEventCard
                  key={event.id ?? `ev-${ei}`}
                  name={event.name ?? event.title ?? 'Event'}
                  date={event.date}
                  time={event.time}
                  venue={event.venue}
                  address={event.address}
                  dressCode={event.dressCode ?? event.dress_code}
                  accentColor={primaryColor}
                  cardBackground={colors.white}
                />
              ),
            )}
            {(!cfg.events || cfg.events.length === 0) && !cfg.name && (
              <Text style={styles.emptyText}>No events yet</Text>
            )}
          </View>
        );

      case 'rsvp':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'RSVP'}
            </Text>
            <View style={styles.rsvpSummary}>
              <RsvpStat
                label="Attending"
                value={cfg.attending ?? 0}
                color={colors.olive}
              />
              <RsvpStat
                label="Declined"
                value={cfg.declined ?? 0}
                color={colors.danger}
              />
              <RsvpStat
                label="Pending"
                value={cfg.pending ?? 0}
                color={colors.gold}
              />
            </View>
          </View>
        );

      case 'registry':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'Registry'}
            </Text>
            {(cfg.links ?? cfg.registries ?? []).map(
              (link: any, li: number) => (
                <View
                  key={li}
                  style={[
                    styles.registryCard,
                    { borderLeftColor: accentColor },
                  ]}
                >
                  <Text style={styles.registryName}>
                    {link.name ?? link.title ?? 'Registry'}
                  </Text>
                  <Text style={styles.registryUrl} numberOfLines={1}>
                    {link.url ?? ''}
                  </Text>
                </View>
              ),
            )}
            {(cfg.links ?? cfg.registries ?? []).length === 0 && (
              <Text style={styles.emptyText}>No registries added</Text>
            )}
          </View>
        );

      case 'travel':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'Travel & Accommodations'}
            </Text>
            {(cfg.hotels ?? cfg.accommodations ?? []).map(
              (hotel: any, hi: number) => (
                <View key={hi} style={styles.hotelCard}>
                  <Text style={styles.hotelName}>
                    {hotel.name ?? 'Hotel'}
                  </Text>
                  {hotel.address && (
                    <Text style={styles.hotelAddress}>{hotel.address}</Text>
                  )}
                  {hotel.phone && (
                    <Text style={styles.hotelDetail}>
                      {'\u{260E}'} {hotel.phone}
                    </Text>
                  )}
                  {hotel.url && (
                    <Text
                      style={[styles.hotelLink, { color: primaryColor }]}
                      numberOfLines={1}
                    >
                      {hotel.url}
                    </Text>
                  )}
                  {hotel.notes && (
                    <Text style={styles.hotelDetail}>{hotel.notes}</Text>
                  )}
                </View>
              ),
            )}
            {(cfg.hotels ?? cfg.accommodations ?? []).length === 0 && (
              <Text style={styles.emptyText}>No hotels added</Text>
            )}
          </View>
        );

      case 'faq':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'FAQ'}
            </Text>
            {(cfg.items ?? cfg.questions ?? []).map(
              (item: any, fi: number) => (
                <FaqItem
                  key={fi}
                  question={item.question ?? item.q ?? ''}
                  answer={item.answer ?? item.a ?? ''}
                  accentColor={primaryColor}
                />
              ),
            )}
            {(cfg.items ?? cfg.questions ?? []).length === 0 && (
              <Text style={styles.emptyText}>No FAQ items yet</Text>
            )}
          </View>
        );

      case 'guestbook':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'Guestbook'}
            </Text>
            {(cfg.messages ?? []).slice(0, 5).map(
              (msg: any, mi: number) => (
                <View key={mi} style={styles.guestbookMsg}>
                  <Text style={styles.guestbookAuthor}>
                    {msg.author ?? msg.name ?? 'Guest'}
                  </Text>
                  <Text style={styles.guestbookText}>
                    {msg.message ?? msg.text ?? ''}
                  </Text>
                </View>
              ),
            )}
            {(cfg.messages ?? []).length === 0 && (
              <Text style={styles.emptyText}>No messages yet</Text>
            )}
          </View>
        );

      case 'photos':
      case 'gallery':
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {cfg.title ?? 'Photos'}
            </Text>
            <View style={styles.photoGrid}>
              {(cfg.photos ?? cfg.images ?? [])
                .slice(0, 6)
                .map((photo: any, pi: number) => (
                  <View key={pi} style={styles.photoCell}>
                    <Image
                      source={{
                        uri:
                          typeof photo === 'string' ? photo : photo.url ?? photo.uri,
                      }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                  </View>
                ))}
            </View>
            {(cfg.photos ?? cfg.images ?? []).length === 0 && (
              <Text style={styles.emptyText}>No photos yet</Text>
            )}
          </View>
        );

      case 'quote':
        return (
          <View key={key} style={styles.section}>
            <View
              style={[
                styles.quoteContainer,
                { borderLeftColor: accentColor },
              ]}
            >
              <Text
                style={[styles.quoteText, { color: textColor }]}
              >
                {'\u201C'}
                {cfg.text ?? cfg.quote ?? cfg.content ?? ''}
                {'\u201D'}
              </Text>
              {(cfg.author ?? cfg.attribution) ? (
                <Text style={[styles.quoteAuthor, { color: primaryColor }]}>
                  {'\u2014 '}{cfg.author ?? cfg.attribution}
                </Text>
              ) : null}
            </View>
          </View>
        );

      case 'countdown':
        return (
          <View key={key} style={styles.section}>
            <View style={[styles.countdownBox, { backgroundColor: primaryColor + '11' }]}>
              <Text style={styles.countdownIcon}>{'\u{23F3}'}</Text>
              <Text style={[styles.countdownLabel, { color: primaryColor }]}>
                {cfg.label ?? 'Days Until the Big Day'}
              </Text>
              {cfg.date && (
                <Text style={[styles.countdownDays, { color: primaryColor }]}>
                  {getDaysUntil(cfg.date)}
                </Text>
              )}
            </View>
          </View>
        );

      case 'spotify':
        return (
          <View key={key} style={styles.section}>
            <View style={[styles.spotifyCard, { borderLeftColor: '#1DB954' }]}>
              <Text style={styles.spotifyIcon}>{'\u{1F3B5}'}</Text>
              <View style={styles.spotifyInfo}>
                <Text style={styles.spotifyTitle}>
                  {cfg.title ?? 'Our Playlist'}
                </Text>
                <Text style={styles.spotifyUrl} numberOfLines={1}>
                  {cfg.url ?? cfg.playlistUrl ?? ''}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'hashtag':
        return (
          <View key={key} style={styles.section}>
            <View
              style={[
                styles.hashtagBox,
                { backgroundColor: primaryColor + '0D' },
              ]}
            >
              <Text style={[styles.hashtagText, { color: primaryColor }]}>
                #{cfg.hashtag ?? cfg.text ?? 'YourHashtag'}
              </Text>
            </View>
          </View>
        );

      case 'video':
        return (
          <View key={key} style={styles.section}>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>{'\u{1F3AC}'}</Text>
              <Text style={styles.videoLabel}>
                {cfg.title ?? 'Video'}
              </Text>
              <Text style={styles.videoUrl} numberOfLines={1}>
                {cfg.url ?? ''}
              </Text>
            </View>
          </View>
        );

      default:
        return (
          <View key={key} style={styles.section}>
            <View style={styles.unknownBlock}>
              <Text style={styles.unknownType}>
                {block.type} block
              </Text>
            </View>
          </View>
        );
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Preview',
            headerStyle: { backgroundColor: colors.cream },
            headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Preview',
            headerStyle: { backgroundColor: colors.cream },
            headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>{'\u26A0'}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchSite}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Preview',
          headerStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable onPress={handleShare} hitSlop={12}>
              <Text style={styles.headerShareIcon}>{'\u{1F517}'}</Text>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
        >
          {blocks.length > 0 ? (
            blocks.map(renderBlock)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{'\u{1F3A8}'}</Text>
              <Text style={styles.emptyTitle}>No Blocks Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add blocks in the editor to build your site
              </Text>
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Floating Edit FAB */}
        <Animated.View
          style={[
            styles.fabContainer,
            { transform: [{ scale: fabScale }] },
          ]}
        >
          <Pressable
            style={[styles.fab, { backgroundColor: primaryColor }]}
            onPress={handleEditPress}
          >
            <Text style={styles.fabIcon}>{'\u{270F}'}</Text>
            <Text style={styles.fabText}>Edit</Text>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function RsvpStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={rsvpStyles.stat}>
      <Text style={[rsvpStyles.statValue, { color }]}>{value}</Text>
      <Text style={rsvpStyles.statLabel}>{label}</Text>
    </View>
  );
}

function FaqItem({
  question,
  answer,
  accentColor,
}: {
  question: string;
  answer: string;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => {
      Animated.spring(heightAnim, {
        toValue: prev ? 0 : 1,
        damping: 16,
        stiffness: 120,
        useNativeDriver: false,
      }).start();
      return !prev;
    });
  }, []);

  const answerMaxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const rotateArrow = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={faqStyles.container}>
      <Pressable style={faqStyles.questionRow} onPress={toggle}>
        <Animated.Text
          style={[
            faqStyles.arrow,
            { color: accentColor, transform: [{ rotate: rotateArrow }] },
          ]}
        >
          {'\u25B6'}
        </Animated.Text>
        <Text style={faqStyles.question}>{question}</Text>
      </Pressable>
      <Animated.View
        style={[faqStyles.answerWrap, { maxHeight: answerMaxHeight }]}
      >
        <Text style={faqStyles.answer}>{answer}</Text>
      </Animated.View>
    </View>
  );
}

function getDaysUntil(dateStr: string): string {
  try {
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'The day has passed!';
    if (diff === 0) return "It's today!";
    if (diff === 1) return '1 day to go';
    return `${diff} days to go`;
  } catch {
    return '';
  }
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
    padding: spacing.xl,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.md,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.white,
  },
  headerShareIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  section: {
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  // Registry
  registryCard: {
    borderLeftWidth: 4,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  registryName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  registryUrl: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  // Travel
  hotelCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  hotelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  hotelAddress: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  hotelDetail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  hotelLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: 2,
  },
  // Guestbook
  guestbookMsg: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  guestbookAuthor: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  guestbookText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg - spacing.xs,
    gap: spacing.xs,
  },
  photoCell: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 2) / 3,
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  // Quote
  quoteContainer: {
    borderLeftWidth: 4,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  quoteText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 30,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  // Countdown
  countdownBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  countdownIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  countdownLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  countdownDays: {
    fontFamily: fonts.heading,
    fontSize: 28,
  },
  // Spotify
  spotifyCard: {
    flexDirection: 'row',
    borderLeftWidth: 4,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  spotifyIcon: {
    fontSize: 28,
  },
  spotifyInfo: {
    flex: 1,
  },
  spotifyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.ink,
  },
  spotifyUrl: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  // Hashtag
  hashtagBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  hashtagText: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: 0.5,
  },
  // Video
  videoPlaceholder: {
    backgroundColor: colors.inkSoft,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  videoLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
  videoUrl: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.white + '88',
    marginTop: 4,
  },
  // Unknown
  unknownBlock: {
    backgroundColor: colors.creamDeep,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  unknownType: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  // RSVP
  rsvpSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  fabIcon: {
    fontSize: 16,
    color: colors.white,
  },
  fabText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.white,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});

const rsvpStyles = StyleSheet.create({
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 32,
  },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const faqStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  arrow: {
    fontSize: 12,
  },
  question: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 21,
  },
  answerWrap: {
    overflow: 'hidden',
  },
  answer: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.lg + spacing.md + 12,
  },
});

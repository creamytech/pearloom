import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Share,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSite, apiFetch } from '@/lib/api';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import NativeHero from '@/components/NativeHero';
import NativeEventCard from '@/components/NativeEventCard';
import NativeChapterCard from '@/components/NativeChapterCard';
import PearChat from '@/components/PearChat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────

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
  vibeSkin?: { palette?: string[]; fontPair?: string };
  theme?: { colors?: Record<string, string> };
  couple?: { names?: [string, string]; date?: string; tagline?: string };
  [key: string]: any;
}

type EditorTab = 'preview' | 'blocks' | 'design';

const TAB_CONFIG: { id: EditorTab; label: string; icon: string }[] = [
  { id: 'preview', label: 'Preview', icon: '\u{1F441}' },
  { id: 'blocks', label: 'Blocks', icon: '\u{1F9F1}' },
  { id: 'design', label: 'Design', icon: '\u{1F3A8}' },
];

// ── Main Editor ────────────────────────────────────────────────────────

export default function EditorScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<EditorTab>('preview');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [coupleNames, setCoupleNames] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pearChatVisible, setPearChatVisible] = useState(false);

  // Publish state
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishSiteName, setPublishSiteName] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = SCREEN_WIDTH / 3;

  // ── Data fetching ────────────────────────────────────────────────────

  const fetchSite = useCallback(async () => {
    try {
      setError(null);
      const site = await getSite(siteId!);
      const m = site.manifest as Manifest;
      setManifest(m);
      const names = site.names?.join(' & ') ?? 'Your Site';
      setCoupleNames(names);
      setIsLive((site as any).is_live ?? false);
      if (!publishSiteName) {
        const suggested = (site.names ?? [])
          .map((n: string) => n.toLowerCase().replace(/\s+/g, ''))
          .join('and');
        setPublishSiteName(suggested || site.domain || '');
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load site');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [siteId]);

  useEffect(() => { fetchSite(); }, [fetchSite]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchSite();
  }, [fetchSite]);

  // ── Tab switching ────────────────────────────────────────────────────

  const switchTab = useCallback((tab: EditorTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    const idx = TAB_CONFIG.findIndex((t) => t.id === tab);
    Animated.spring(tabIndicatorX, {
      toValue: idx * tabWidth,
      damping: 20,
      stiffness: 250,
      useNativeDriver: true,
    }).start();
  }, [tabWidth, tabIndicatorX]);

  // ── Navigation helpers ───────────────────────────────────────────────

  const navigateToBlocks = useCallback(() => {
    router.push({ pathname: '/editor/blocks', params: { siteId: siteId! } });
  }, [router, siteId]);

  const navigateToDesign = useCallback(() => {
    router.push({ pathname: '/editor/design', params: { siteId: siteId! } });
  }, [router, siteId]);

  const navigateToBlockConfig = useCallback((block: Block) => {
    router.push({
      pathname: '/editor/block-config/[blockId]',
      params: {
        blockId: block.id,
        siteId: siteId!,
        blockType: block.type,
        blockName: block.title ?? block.name ?? block.type,
      },
    });
  }, [router, siteId]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://pearloom.com/s/${siteId}`;
    await Share.share({ url, message: `Check out our site: ${url}` });
  }, [siteId]);

  // ── Pear Chat handlers ──────────────────────────────────────────────

  const handleOpenPearChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPearChatVisible(true);
  }, []);

  const handleClosePearChat = useCallback(() => {
    setPearChatVisible(false);
  }, []);

  const handleManifestUpdate = useCallback(
    (updated: Manifest) => {
      setManifest(updated);
      // Persist the updated manifest to the server
      apiFetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        body: JSON.stringify({ manifest: updated }),
      }).catch((err: any) => {
        console.warn('[PearChat] Failed to save manifest:', err.message);
      });
    },
    [siteId],
  );

  // ── Publish handlers ─────────────────────────────────────────────────

  const handleOpenPublish = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPublishError(null);
    setPublishedUrl(null);
    setPublishModalVisible(true);
  }, []);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const result = await apiFetch<{ url: string; domain: string }>(
        '/api/sites/publish',
        {
          method: 'POST',
          body: JSON.stringify({
            siteId,
            siteName: publishSiteName.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          }),
        },
      );
      setPublishedUrl(result.url ?? `https://${publishSiteName}.pearloom.com`);
      setIsLive(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setPublishError(err.message ?? 'Failed to publish. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPublishing(false);
    }
  }, [siteId, publishSiteName]);

  const handleCopyLink = useCallback(async () => {
    if (publishedUrl) {
      await Clipboard.setStringAsync(publishedUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Link copied to clipboard.');
    }
  }, [publishedUrl]);

  const handleSharePublished = useCallback(async () => {
    if (publishedUrl) {
      await Share.share({
        url: publishedUrl,
        message: `Check out our site: ${publishedUrl}`,
      });
    }
  }, [publishedUrl]);

  // ── Theme ────────────────────────────────────────────────────────────

  const palette = manifest?.vibeSkin?.palette ?? [];
  const tc = manifest?.theme?.colors;
  const primaryColor = palette[0] ?? tc?.primary ?? colors.olive;
  const accentColor = palette[1] ?? tc?.accent ?? colors.gold;
  const bgColor = palette[4] ?? tc?.background ?? colors.cream;
  const textColor = palette[3] ?? tc?.text ?? colors.ink;

  const blocks = (manifest?.blocks ?? []).filter((b) => b.visible !== false);

  // ── Block rendering ──────────────────────────────────────────────────

  const renderBlock = (block: Block, index: number) => {
    const key = block.id ?? `block-${index}`;
    const cfg = block.config ?? block.data ?? block;

    return (
      <Pressable
        key={key}
        onPress={() => navigateToBlockConfig(block)}
        style={styles.editableBlock}
      >
        {renderBlockContent(block, cfg)}
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>Tap to edit</Text>
        </View>
      </Pressable>
    );
  };

  const renderBlockContent = (block: Block, cfg: any) => {
    switch (block.type) {
      case 'hero':
        return (
          <NativeHero
            coupleNames={cfg.coupleNames ?? manifest?.couple?.names?.join(' & ') ?? coupleNames}
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
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'Our Story'}</Text>
            {(cfg.chapters ?? []).map((ch: any, ci: number) => (
              <NativeChapterCard
                key={ch.id ?? `ch-${ci}`}
                title={ch.title ?? ''}
                subtitle={ch.subtitle}
                description={ch.description ?? ch.text}
                photoUrl={ch.photo ?? ch.photoUrl}
                date={ch.date}
                mood={ch.mood}
                accentColor={primaryColor}
              />
            ))}
            {(!cfg.chapters || cfg.chapters.length === 0) && <Text style={styles.emptyText}>No story chapters yet</Text>}
          </View>
        );

      case 'events': case 'event':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'Events'}</Text>
            {(cfg.events ?? (cfg.name ? [cfg] : [])).map((ev: any, ei: number) => (
              <NativeEventCard
                key={ev.id ?? `ev-${ei}`}
                name={ev.name ?? ev.title ?? 'Event'}
                date={ev.date}
                time={ev.time}
                venue={ev.venue}
                address={ev.address}
                dressCode={ev.dressCode ?? ev.dress_code}
                accentColor={primaryColor}
                cardBackground={colors.white}
              />
            ))}
            {(!cfg.events || cfg.events.length === 0) && !cfg.name && <Text style={styles.emptyText}>No events yet</Text>}
          </View>
        );

      case 'rsvp':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'RSVP'}</Text>
            <View style={styles.rsvpRow}>
              <StatBox label="Attending" value={cfg.attending ?? 0} color={colors.olive} />
              <StatBox label="Declined" value={cfg.declined ?? 0} color={colors.danger} />
              <StatBox label="Pending" value={cfg.pending ?? 0} color={colors.gold} />
            </View>
          </View>
        );

      case 'quote':
        return (
          <View style={styles.section}>
            <View style={[styles.quoteBox, { borderLeftColor: accentColor }]}>
              <Text style={[styles.quoteText, { color: textColor }]}>
                {'\u201C'}{cfg.text ?? cfg.quote ?? cfg.content ?? ''}{'\u201D'}
              </Text>
              {(cfg.author ?? cfg.attribution) ? (
                <Text style={[styles.quoteAuthor, { color: primaryColor }]}>{'\u2014 '}{cfg.author ?? cfg.attribution}</Text>
              ) : null}
            </View>
          </View>
        );

      case 'countdown':
        return (
          <View style={styles.section}>
            <View style={[styles.countdownBox, { backgroundColor: primaryColor + '11' }]}>
              <Text style={styles.countdownIcon}>{'\u{23F3}'}</Text>
              <Text style={[styles.countdownLabel, { color: primaryColor }]}>{cfg.label ?? 'Days Until the Big Day'}</Text>
              {cfg.date && <Text style={[styles.countdownDays, { color: primaryColor }]}>{getDaysUntil(cfg.date)}</Text>}
            </View>
          </View>
        );

      case 'photos': case 'gallery':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'Photos'}</Text>
            <View style={styles.photoGrid}>
              {(cfg.photos ?? cfg.images ?? []).slice(0, 6).map((p: any, pi: number) => (
                <View key={pi} style={styles.photoCell}>
                  <Image source={{ uri: typeof p === 'string' ? p : p.url ?? p.uri }} style={styles.photoThumb} resizeMode="cover" />
                </View>
              ))}
            </View>
            {(cfg.photos ?? cfg.images ?? []).length === 0 && <Text style={styles.emptyText}>No photos yet</Text>}
          </View>
        );

      case 'registry':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'Registry'}</Text>
            {(cfg.links ?? cfg.registries ?? []).map((link: any, li: number) => (
              <View key={li} style={[styles.listCard, { borderLeftColor: accentColor }]}>
                <Text style={styles.listCardTitle}>{link.name ?? link.title ?? 'Registry'}</Text>
                <Text style={styles.listCardSub} numberOfLines={1}>{link.url ?? ''}</Text>
              </View>
            ))}
            {(cfg.links ?? cfg.registries ?? []).length === 0 && <Text style={styles.emptyText}>No registries added</Text>}
          </View>
        );

      case 'travel':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'Travel'}</Text>
            {(cfg.hotels ?? cfg.accommodations ?? []).map((h: any, hi: number) => (
              <View key={hi} style={styles.travelCard}>
                <Text style={styles.travelName}>{h.name ?? 'Hotel'}</Text>
                {h.address && <Text style={styles.travelDetail}>{h.address}</Text>}
                {h.phone && <Text style={styles.travelDetail}>{'\u{260E}'} {h.phone}</Text>}
              </View>
            ))}
            {(cfg.hotels ?? cfg.accommodations ?? []).length === 0 && <Text style={styles.emptyText}>No hotels added</Text>}
          </View>
        );

      case 'faq':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'FAQ'}</Text>
            {(cfg.items ?? cfg.questions ?? []).map((item: any, fi: number) => (
              <View key={fi} style={styles.faqItem}>
                <Text style={styles.faqQ}>{item.question ?? item.q ?? ''}</Text>
                <Text style={styles.faqA}>{item.answer ?? item.a ?? ''}</Text>
              </View>
            ))}
            {(cfg.items ?? cfg.questions ?? []).length === 0 && <Text style={styles.emptyText}>No FAQ items yet</Text>}
          </View>
        );

      case 'guestbook':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title ?? 'Guestbook'}</Text>
            {(cfg.messages ?? []).slice(0, 5).map((msg: any, mi: number) => (
              <View key={mi} style={styles.guestMsg}>
                <Text style={styles.guestAuthor}>{msg.author ?? msg.name ?? 'Guest'}</Text>
                <Text style={styles.guestText}>{msg.message ?? msg.text ?? ''}</Text>
              </View>
            ))}
            {(cfg.messages ?? []).length === 0 && <Text style={styles.emptyText}>No messages yet</Text>}
          </View>
        );

      case 'spotify':
        return (
          <View style={styles.section}>
            <View style={[styles.spotifyCard, { borderLeftColor: '#1DB954' }]}>
              <Text style={{ fontSize: 28 }}>{'\u{1F3B5}'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.spotifyTitle}>{cfg.title ?? 'Our Playlist'}</Text>
                <Text style={styles.spotifySub} numberOfLines={1}>{cfg.url ?? cfg.playlistUrl ?? ''}</Text>
              </View>
            </View>
          </View>
        );

      case 'hashtag':
        return (
          <View style={styles.section}>
            <View style={[styles.hashtagBox, { backgroundColor: primaryColor + '0D' }]}>
              <Text style={[styles.hashtagText, { color: primaryColor }]}>#{cfg.hashtag ?? cfg.text ?? 'YourHashtag'}</Text>
            </View>
          </View>
        );

      case 'video':
        return (
          <View style={styles.section}>
            <View style={styles.videoBox}>
              <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>{'\u{1F3AC}'}</Text>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.white }}>{cfg.title ?? 'Video'}</Text>
            </View>
          </View>
        );

      case 'text':
        return (
          <View style={styles.section}>
            {cfg.title ? <Text style={[styles.sectionTitle, { color: textColor }]}>{cfg.title}</Text> : null}
            <Text style={styles.textBlockBody}>{cfg.text ?? cfg.content ?? cfg.body ?? ''}</Text>
          </View>
        );

      case 'welcome':
      case 'vibeQuote':
        return (
          <View style={styles.section}>
            <View style={styles.welcomeBox}>
              <Text style={[styles.welcomeText, { color: textColor }]}>{cfg.text ?? cfg.statement ?? cfg.quote ?? cfg.content ?? ''}</Text>
            </View>
          </View>
        );

      case 'footer':
        return (
          <View style={styles.footerSection}>
            {(cfg.text ?? cfg.closingText ?? cfg.content) ? (
              <Text style={[styles.footerText, { color: textColor }]}>{cfg.text ?? cfg.closingText ?? cfg.content}</Text>
            ) : null}
            <Text style={styles.footerBrand}>Made with Pearloom</Text>
          </View>
        );

      default:
        return (
          <View style={styles.section}>
            <View style={styles.unknownBlock}>
              <Text style={styles.unknownText}>{block.type} block</Text>
            </View>
          </View>
        );
    }
  };

  // ── Loading / Error ──────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Editor', headerStyle: { backgroundColor: colors.cream }, headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink }, headerShadowVisible: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.olive} />
          <Text style={styles.loadingText}>Loading editor...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Editor', headerStyle: { backgroundColor: colors.cream }, headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink }, headerShadowVisible: false }} />
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: spacing.md }}>{'\u26A0'}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchSite(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: coupleNames || 'Editor',
          headerStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink, fontSize: 16 },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              )}
              <Pressable
                onPress={handleOpenPublish}
                style={[styles.publishBtn, isLive && styles.publishBtnLive]}
              >
                <Text style={[styles.publishBtnText, isLive && styles.publishBtnTextLive]}>
                  {isLive ? 'Update' : 'Publish'}
                </Text>
              </Pressable>
              <Pressable onPress={handleShare} hitSlop={12} style={{ marginRight: spacing.sm }}>
                <Text style={{ fontSize: 18 }}>{'\u{1F517}'}</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Tab Bar (top) */}
        <View style={styles.tabBar}>
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable key={tab.id} style={styles.tabItem} onPress={() => switchTab(tab.id)}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
          <Animated.View style={[styles.tabIndicator, { width: tabWidth, transform: [{ translateX: tabIndicatorX }] }]} />
        </View>

        {/* ── Preview Tab ─────────────────────────────────────────── */}
        {activeTab === 'preview' && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} colors={[primaryColor]} />}
          >
            {blocks.length > 0 ? blocks.map(renderBlock) : (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: spacing.md }}>{'\u{1F3A8}'}</Text>
                <Text style={styles.emptyTitle}>No Blocks Yet</Text>
                <Text style={styles.emptySub}>Go to the Blocks tab to add content</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ── Blocks Tab ──────────────────────────────────────────── */}
        {activeTab === 'blocks' && (
          <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.actionCard}>
              <Text style={{ fontSize: 36, marginBottom: spacing.md }}>{'\u{1F9F1}'}</Text>
              <Text style={styles.actionTitle}>Block Manager</Text>
              <Text style={styles.actionDesc}>Add, remove, reorder, and configure your site blocks.</Text>
              <Pressable style={styles.actionBtn} onPress={navigateToBlocks}>
                <Text style={styles.actionBtnText}>Open Block Manager</Text>
              </Pressable>
            </View>

            <View style={styles.quickList}>
              <Text style={styles.quickHeader}>{blocks.length} active block{blocks.length !== 1 ? 's' : ''}</Text>
              {blocks.slice(0, 10).map((block) => (
                <Pressable key={block.id} style={styles.quickRow} onPress={() => navigateToBlockConfig(block)}>
                  <Text style={styles.quickIcon}>{getBlockIcon(block.type)}</Text>
                  <Text style={styles.quickName} numberOfLines={1}>{block.title ?? block.name ?? block.type}</Text>
                  <Text style={styles.quickArrow}>{'\u203A'}</Text>
                </Pressable>
              ))}
              {blocks.length > 10 && <Text style={styles.quickMore}>+{blocks.length - 10} more</Text>}
            </View>
          </ScrollView>
        )}

        {/* ── Design Tab ──────────────────────────────────────────── */}
        {activeTab === 'design' && (
          <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.actionCard}>
              <Text style={{ fontSize: 36, marginBottom: spacing.md }}>{'\u{1F3A8}'}</Text>
              <Text style={styles.actionTitle}>Design Studio</Text>
              <Text style={styles.actionDesc}>Customize colors, fonts, and theme presets for your site.</Text>
              <Pressable style={styles.actionBtn} onPress={navigateToDesign}>
                <Text style={styles.actionBtnText}>Open Design Studio</Text>
              </Pressable>
            </View>

            <View style={styles.paletteCard}>
              <Text style={styles.paletteLabel}>Current Palette</Text>
              <View style={styles.paletteRow}>
                {(palette.length > 0 ? palette : ['#A3B18A', '#C4A96A', '#FAF7F2', '#1C1C1C', '#F5F1E8']).slice(0, 5).map((c, i) => (
                  <View key={i} style={[styles.paletteSwatch, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={styles.fontLabel}>Font: {manifest?.vibeSkin?.fontPair ?? 'classic'}</Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── Floating Pear Button ──────────────────────────────────── */}
      {!pearChatVisible && (
        <Pressable style={styles.pearFab} onPress={handleOpenPearChat}>
          <Text style={styles.pearFabIcon}>{'\uD83C\uDF50'}</Text>
        </Pressable>
      )}

      {/* ── Pear Chat Bottom Sheet ───────────────────────────────── */}
      <PearChat
        visible={pearChatVisible}
        onClose={handleClosePearChat}
        manifest={manifest ?? {}}
        onManifestUpdate={handleManifestUpdate}
      />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: fonts.heading, fontSize: 32, color }}>{value}</Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function getDaysUntil(dateStr: string): string {
  try {
    const target = new Date(dateStr).getTime();
    const diff = Math.ceil((target - Date.now()) / 86400000);
    if (diff < 0) return 'The day has passed!';
    if (diff === 0) return "It's today!";
    if (diff === 1) return '1 day to go';
    return `${diff} days to go`;
  } catch { return ''; }
}

function getBlockIcon(type: string): string {
  const m: Record<string, string> = {
    hero: '\u{1F3A8}', story: '\u{1F4D6}', events: '\u{1F4C5}', event: '\u{1F4C5}',
    rsvp: '\u{1F48C}', registry: '\u{1F381}', travel: '\u{2708}', faq: '\u{2753}',
    guestbook: '\u{1F4AC}', photos: '\u{1F4F7}', gallery: '\u{1F4F7}', quote: '\u{201C}',
    countdown: '\u{23F3}', spotify: '\u{1F3B5}', hashtag: '#', video: '\u{1F3AC}', text: '\u{1F4DD}',
  };
  return m[type] ?? '\u{1F4E6}';
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream, padding: spacing.xl },
  loadingText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginTop: spacing.md },
  errorText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.danger, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { backgroundColor: colors.olive, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white },

  // Tab bar
  tabBar: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.creamDeep, position: 'relative' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 2 },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tabLabelActive: { color: colors.olive, fontFamily: fonts.bodySemibold },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2.5, backgroundColor: colors.olive, borderRadius: 1.5 },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Editable block
  editableBlock: { position: 'relative' },
  editBadge: { position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  editBadgeText: { fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.white, letterSpacing: 0.3 },

  // Sections
  section: { paddingVertical: spacing.lg },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 24, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },

  // RSVP
  rsvpRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },

  // Quote
  quoteBox: { borderLeftWidth: 4, paddingLeft: spacing.lg, paddingRight: spacing.lg, marginHorizontal: spacing.lg },
  quoteText: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 30, fontStyle: 'italic' },
  quoteAuthor: { fontFamily: fonts.bodySemibold, fontSize: 14, marginTop: spacing.sm },

  // Countdown
  countdownBox: { marginHorizontal: spacing.lg, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center' },
  countdownIcon: { fontSize: 32, marginBottom: spacing.sm },
  countdownLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, marginBottom: spacing.xs },
  countdownDays: { fontFamily: fonts.heading, fontSize: 28 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg - spacing.xs, gap: spacing.xs },
  photoCell: { width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 2) / 3, aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%' },

  // List card
  listCard: { borderLeftWidth: 4, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginHorizontal: spacing.lg, marginVertical: spacing.sm, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }) },
  listCardTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink, marginBottom: 4 },
  listCardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },

  // Travel
  travelCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginHorizontal: spacing.lg, marginVertical: spacing.sm, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }) },
  travelName: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink, marginBottom: 4 },
  travelDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: 2 },

  // FAQ
  faqItem: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginHorizontal: spacing.lg, marginVertical: spacing.xs, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }) },
  faqQ: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink, marginBottom: spacing.sm },
  faqA: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },

  // Guestbook
  guestMsg: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginHorizontal: spacing.lg, marginVertical: spacing.xs, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }) },
  guestAuthor: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink, marginBottom: 4 },
  guestText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },

  // Spotify
  spotifyCard: { flexDirection: 'row', borderLeftWidth: 4, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginHorizontal: spacing.lg, alignItems: 'center', gap: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }) },
  spotifyTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink },
  spotifySub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },

  // Hashtag
  hashtagBox: { marginHorizontal: spacing.lg, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center' },
  hashtagText: { fontFamily: fonts.heading, fontSize: 28, letterSpacing: 0.5 },

  // Video
  videoBox: { backgroundColor: colors.inkSoft, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.xxl, alignItems: 'center' },

  // Text
  textBlockBody: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, lineHeight: 24, paddingHorizontal: spacing.lg },

  // Welcome / VibeQuote
  welcomeBox: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, alignItems: 'center' },
  welcomeText: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 30, fontStyle: 'italic', textAlign: 'center' },

  // Footer
  footerSection: { paddingVertical: spacing.xxl, alignItems: 'center', paddingHorizontal: spacing.lg },
  footerText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: spacing.md },
  footerBrand: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, letterSpacing: 0.5 },

  // Unknown
  unknownBlock: { backgroundColor: colors.creamDeep, marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  unknownText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted, textTransform: 'capitalize' },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodySemibold, fontSize: 18, color: colors.ink, marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },

  // Action card (Blocks/Design tabs)
  actionCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  actionTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.ink, marginBottom: spacing.xs },
  actionDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  actionBtn: { backgroundColor: colors.olive, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md + 2, borderRadius: radius.lg },
  actionBtnText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white },

  // Quick block list
  quickList: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }) },
  quickHeader: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: spacing.lg, paddingBottom: spacing.sm },
  quickRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.creamDeep, gap: spacing.md },
  quickIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  quickName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  quickArrow: { fontSize: 20, color: colors.muted },
  quickMore: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: spacing.md },

  // Palette card
  paletteCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }) },
  paletteLabel: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  paletteRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  paletteSwatch: { flex: 1, height: 32, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  fontLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, textTransform: 'capitalize' },

  // Floating Pear button
  pearFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  pearFabIcon: { fontSize: 24 },
});

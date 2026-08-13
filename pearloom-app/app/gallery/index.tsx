import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import { getSites, uploadPhoto } from '@/lib/api';
import type { UserSite } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const PHOTO_GAP = 2;
const PHOTO_SIZE = (SCREEN_WIDTH - PHOTO_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface PhotoItem {
  url: string;
  siteId: string;
  siteName: string;
}

export default function GalleryScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);

  const extractPhotos = useCallback((sites: UserSite[]): PhotoItem[] => {
    const allPhotos: PhotoItem[] = [];
    for (const site of sites) {
      const m = site.manifest;
      if (!m || !m.blocks) continue;
      const siteName = site.names?.join(' & ') ?? site.domain ?? 'Site';

      for (const block of m.blocks) {
        const cfg = block.config ?? block.data ?? block;

        // Hero cover photo
        if (block.type === 'hero') {
          const cover = cfg.coverPhoto ?? cfg.coverPhotoUrl;
          if (cover) {
            allPhotos.push({ url: cover, siteId: site.id, siteName });
          }
        }

        // Story chapters
        if (block.type === 'story') {
          for (const ch of cfg.chapters ?? []) {
            const photo = ch.photo ?? ch.photoUrl;
            if (photo) {
              allPhotos.push({ url: photo, siteId: site.id, siteName });
            }
          }
        }

        // Photo/gallery blocks
        if (block.type === 'photos' || block.type === 'gallery') {
          for (const p of cfg.photos ?? cfg.images ?? []) {
            const url = typeof p === 'string' ? p : p.url ?? p.uri;
            if (url) {
              allPhotos.push({ url, siteId: site.id, siteName });
            }
          }
        }
      }
    }
    return allPhotos;
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      const sites = await getSites();
      const extracted = extractPhotos(sites);
      setPhotos(extracted);
    } catch {
      // silently fail — empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [extractPhotos]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUpload = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access in Settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled || result.assets.length === 0) return;

      setUploading(true);
      for (const asset of result.assets) {
        const uriParts = asset.uri.split('/');
        const fileName = uriParts[uriParts.length - 1] ?? 'photo.jpg';
        await uploadPhoto({
          uri: asset.uri,
          type: asset.mimeType ?? 'image/jpeg',
          name: fileName,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh gallery after upload
      fetchPhotos();
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  }, [fetchPhotos]);

  const renderPhoto = useCallback(
    ({ item }: { item: PhotoItem }) => (
      <Pressable
        style={styles.photoCell}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setViewerPhoto(item.url);
        }}
      >
        <Image source={{ uri: item.url }} style={styles.photoImage} resizeMode="cover" />
      </Pressable>
    ),
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.olive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <FontAwesome name="arrow-left" size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Pressable
          style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <FontAwesome name="cloud-upload" size={14} color={colors.white} />
              <Text style={styles.uploadBtnText}>Upload</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Photo grid or empty state */}
      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <FontAwesome name="photo" size={32} color={colors.olive} />
          </View>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
            Upload photos or create a site to get started.
          </Text>
          <Pressable style={styles.emptyUploadBtn} onPress={handleUpload}>
            <FontAwesome name="cloud-upload" size={16} color={colors.white} />
            <Text style={styles.emptyUploadText}>Upload Photos</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item, idx) => `${item.url}-${idx}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
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

      {/* Full-screen viewer */}
      <Modal
        visible={!!viewerPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerPhoto(null)}
      >
        <Pressable style={styles.viewerOverlay} onPress={() => setViewerPhoto(null)}>
          <Pressable style={styles.viewerCloseBtn} onPress={() => setViewerPhoto(null)}>
            <FontAwesome name="close" size={20} color={colors.white} />
          </Pressable>
          {viewerPhoto && (
            <Image
              source={{ uri: viewerPhoto }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  uploadBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.white,
  },
  gridContent: {
    padding: PHOTO_GAP,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: PHOTO_GAP / 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.olive + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyUploadText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.white,
  },
  // Full-screen viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});

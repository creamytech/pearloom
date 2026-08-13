import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import { getSites } from '@/lib/api';
import type { UserSite } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const PHOTO_GAP = 2;
const PHOTO_SIZE = (SCREEN_WIDTH - PHOTO_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface GalleryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface PhotoItem {
  url: string;
}

function extractPhotosFromSites(sites: UserSite[]): PhotoItem[] {
  const allPhotos: PhotoItem[] = [];
  for (const site of sites) {
    const m = site.manifest;
    if (!m || !m.blocks) continue;

    for (const block of m.blocks) {
      const cfg = block.config ?? block.data ?? block;

      if (block.type === 'hero') {
        const cover = cfg.coverPhoto ?? cfg.coverPhotoUrl;
        if (cover) allPhotos.push({ url: cover });
      }

      if (block.type === 'story') {
        for (const ch of cfg.chapters ?? []) {
          const photo = ch.photo ?? ch.photoUrl;
          if (photo) allPhotos.push({ url: photo });
        }
      }

      if (block.type === 'photos' || block.type === 'gallery') {
        for (const p of cfg.photos ?? cfg.images ?? []) {
          const url = typeof p === 'string' ? p : p.url ?? p.uri;
          if (url) allPhotos.push({ url });
        }
      }
    }
  }
  return allPhotos;
}

export default function GalleryPicker({ visible, onClose, onSelect }: GalleryPickerProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getSites()
      .then((sites) => {
        setPhotos(extractPhotosFromSites(sites));
      })
      .catch(() => {
        setPhotos([]);
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const handleSelect = useCallback(
    (url: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(url);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderPhoto = useCallback(
    ({ item }: { item: PhotoItem }) => (
      <Pressable style={styles.photoCell} onPress={() => handleSelect(item.url)}>
        <Image source={{ uri: item.url }} style={styles.photoImage} resizeMode="cover" />
      </Pressable>
    ),
    [handleSelect],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Choose from Gallery</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <FontAwesome name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.olive} />
            </View>
          ) : photos.length === 0 ? (
            <View style={styles.centered}>
              <FontAwesome name="photo" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>No photos in your gallery</Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              renderItem={renderPhoto}
              keyExtractor={(item, idx) => `${item.url}-${idx}`}
              numColumns={NUM_COLUMNS}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    minHeight: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.creamDeep,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    width: '100%',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 300,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
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
    borderRadius: 4,
  },
});

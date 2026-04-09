import React, { useRef, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import type { WizardPhoto } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = spacing.xl;
const GAP = spacing.sm;
const NUM_COLUMNS = 3;
const ITEM_SIZE =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

/** @deprecated Use WizardPhoto from @/lib/types instead */
export type PhotoItem = WizardPhoto;

interface PhotoGridProps {
  photos: WizardPhoto[];
  onRemove: (id: string) => void;
  onAdd: () => void;
  maxPhotos?: number;
}

/** Animated wrapper for each photo thumbnail */
function AnimatedPhoto({
  photo,
  onRemove,
  index,
}: {
  photo: WizardPhoto;
  onRemove: (id: string) => void;
  index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      delay: index * 40,
      useNativeDriver: true,
    }).start();
  }, []);

  function handleRemove() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Photo', 'Remove this photo from your selection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onRemove(photo.id));
        },
      },
    ]);
  }

  return (
    <Animated.View
      style={[
        styles.photoWrapper,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pressScale) },
          ],
        },
      ]}
    >
      <Pressable
        onLongPress={handleRemove}
        onPressIn={() => {
          Animated.spring(pressScale, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start();
        }}
        style={styles.photoContainer}
      >
        <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
        <Pressable style={styles.removeButton} onPress={handleRemove} hitSlop={8}>
          <FontAwesome name="times" size={10} color={colors.white} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default function PhotoGrid({
  photos,
  onRemove,
  onAdd,
  maxPhotos = 40,
}: PhotoGridProps) {
  const canAdd = photos.length < maxPhotos;

  return (
    <View style={styles.container}>
      {/* Count badge */}
      <View style={styles.countRow}>
        <View style={styles.countBadge}>
          <FontAwesome name="image" size={12} color={colors.olive} />
          <Text style={styles.countText}>
            {photos.length}/{maxPhotos} selected
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <AnimatedPhoto
            key={photo.id}
            photo={photo}
            onRemove={onRemove}
            index={index}
          />
        ))}

        {/* Add button as last grid item */}
        {canAdd && (
          <Pressable
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAdd();
            }}
          >
            <FontAwesome name="plus" size={24} color={colors.olive} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.olive + '18',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  countText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.oliveDeep,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  photoWrapper: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.olive + '50',
    backgroundColor: colors.olive + '08',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.olive,
  },
});

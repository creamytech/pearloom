import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import PhotoGrid from '@/components/PhotoGrid';
import type { WizardPhoto } from '@/lib/types';

const MAX_PHOTOS = 40;

interface PhotosStepProps {
  photos: WizardPhoto[];
  onUpdatePhotos: (photos: WizardPhoto[]) => void;
}

let photoCounter = 0;
function generatePhotoId(): string {
  photoCounter += 1;
  return `photo_${Date.now()}_${photoCounter}`;
}

export default function PhotosStep({ photos, onUpdatePhotos }: PhotosStepProps) {
  const handlePickFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to add photos.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 0.85,
      });

      if (result.canceled || result.assets.length === 0) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPhotos: WizardPhoto[] = result.assets.map((asset) => ({
        uri: asset.uri,
        id: generatePhotoId(),
      }));

      onUpdatePhotos([...photos, ...newPhotos].slice(0, MAX_PHOTOS));
    } catch (err) {
      Alert.alert('Error', 'Could not access photo library. Please try again.');
    }
  }, [photos, onUpdatePhotos]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera access to take photos.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || result.assets.length === 0) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPhoto: WizardPhoto = {
        uri: result.assets[0].uri,
        id: generatePhotoId(),
      };

      onUpdatePhotos([...photos, newPhoto].slice(0, MAX_PHOTOS));
    } catch (err) {
      Alert.alert('Error', 'Could not access camera. Please try again.');
    }
  }, [photos, onUpdatePhotos]);

  const handleRemovePhoto = useCallback(
    (id: string) => {
      onUpdatePhotos(photos.filter((p) => p.id !== id));
    },
    [photos, onUpdatePhotos],
  );

  const handleAddViaGrid = useCallback(() => {
    // Show action sheet to choose camera or library
    Alert.alert('Add Photos', 'Choose a source', [
      { text: 'Camera', onPress: handleTakePhoto },
      { text: 'Photo Library', onPress: handlePickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleTakePhoto, handlePickFromLibrary]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Heading */}
      <Text style={styles.heading}>Add Your Photos</Text>
      <Text style={styles.subtitle}>
        Upload your favorite moments. Our AI will weave them into a stunning
        celebration site.
      </Text>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={handleTakePhoto}
        >
          <View style={styles.actionIconWrap}>
            <FontAwesome name="camera" size={18} color={colors.olive} />
          </View>
          <Text style={styles.actionLabel}>Camera</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={handlePickFromLibrary}
        >
          <View style={styles.actionIconWrap}>
            <FontAwesome name="image" size={18} color={colors.plum} />
          </View>
          <Text style={styles.actionLabel}>Library</Text>
        </Pressable>
      </View>

      {/* Photo grid */}
      {photos.length > 0 ? (
        <PhotoGrid
          photos={photos}
          onRemove={handleRemovePhoto}
          onAdd={handleAddViaGrid}
          maxPhotos={MAX_PHOTOS}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <FontAwesome name="photo" size={32} color={colors.olive + '60'} />
          </View>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the buttons above to add photos from your camera or library
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + 60,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.ink,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.olive + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});

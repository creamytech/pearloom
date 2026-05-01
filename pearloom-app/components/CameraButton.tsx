import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing } from '@/lib/theme';

interface CameraButtonProps {
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
}

export default function CameraButton({
  onTakePhoto,
  onPickFromLibrary,
}: CameraButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onTakePhoto();
          } else if (buttonIndex === 2) {
            onPickFromLibrary();
          }
        },
      );
    } else {
      // Android fallback using Alert with buttons
      Alert.alert('Add Photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: onTakePhoto },
        { text: 'Choose from Library', onPress: onPickFromLibrary },
      ]);
    }
  };

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel="Add Photo"
      accessibilityRole="button"
    >
      <FontAwesome name="camera" size={22} color={colors.white} />
    </TouchableOpacity>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.xl + 60, // above tab bar
    right: spacing.xl,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for iOS
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 6,
    zIndex: 100,
  },
});

import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { uploadPhoto } from './api';

/**
 * Opens the device photo library and lets the user pick an image.
 * Returns a file descriptor suitable for upload, or null if cancelled.
 */
export async function pickImageFromLibrary(): Promise<{
  uri: string;
  type: string;
  name: string;
} | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Photo library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const uriParts = asset.uri.split('/');
  const fileName = uriParts[uriParts.length - 1] ?? 'photo.jpg';
  const mimeType = asset.mimeType ?? 'image/jpeg';

  return { uri: asset.uri, type: mimeType, name: fileName };
}

/**
 * Opens the native camera and lets the user take a photo.
 * Returns a file descriptor suitable for upload, or null if cancelled.
 */
export async function takePhoto(): Promise<{
  uri: string;
  type: string;
  name: string;
} | null> {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera permission not granted');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const uriParts = asset.uri.split('/');
  const fileName = uriParts[uriParts.length - 1] ?? 'photo.jpg';
  const mimeType = asset.mimeType ?? 'image/jpeg';

  return { uri: asset.uri, type: mimeType, name: fileName };
}

/**
 * Uploads a file to the Pearloom API and returns the public URL.
 */
export async function uploadAndGetUrl(file: {
  uri: string;
  type: string;
  name: string;
}): Promise<string> {
  const { publicUrl } = await uploadPhoto(file);
  return publicUrl;
}

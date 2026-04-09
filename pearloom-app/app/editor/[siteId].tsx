import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  Platform,
  BackHandler,
  Share,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { View } from '@/components/Themed';
import CameraButton from '@/components/CameraButton';
import {
  pickImageFromLibrary,
  takePhoto,
  uploadAndGetUrl,
} from '@/lib/photo-bridge';
import { colors } from '@/lib/theme';
import { useFocusEffect } from 'expo-router';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://pearloom.com';
const TOKEN_KEY = 'pearloom_auth_token';

/**
 * JS injected into the WebView so the web editor can detect it is running
 * inside the native Pearloom app and use window.ReactNativeWebView.postMessage.
 */
const INJECTED_JS = `
  (function() {
    window.__PEARLOOM_NATIVE__ = true;
    window.__PEARLOOM_PLATFORM__ = '${Platform.OS}';

    // Notify the web editor that the native bridge is ready
    if (window.dispatchEvent) {
      window.dispatchEvent(new Event('pearloom:native-ready'));
    }
  })();
  true; // required by react-native-webview
`;

// ── Bridge message types ────────────────────────────────────────────────

interface PickPhotoMessage {
  type: 'PICK_PHOTO';
}

interface TakePhotoMessage {
  type: 'TAKE_PHOTO';
}

interface HapticMessage {
  type: 'HAPTIC';
  style: 'light' | 'medium' | 'heavy';
}

interface ShareMessage {
  type: 'SHARE';
  url: string;
}

interface NavigateBackMessage {
  type: 'NAVIGATE_BACK';
}

type BridgeMessage =
  | PickPhotoMessage
  | TakePhotoMessage
  | HapticMessage
  | ShareMessage
  | NavigateBackMessage;

// ── Component ────────────────────────────────────────────────────────────

export default function EditorScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const editorUrl = `${API_BASE}/editor/${siteId}`;

  // ── Android back button ──────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true; // prevent default back
        }
        return false; // let default back happen (navigate away)
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [canGoBack]),
  );

  // ── Send message to WebView ──────────────────────────────────────────

  const sendToWeb = useCallback(
    (message: Record<string, unknown>) => {
      webViewRef.current?.postMessage(JSON.stringify(message));
    },
    [],
  );

  // ── Photo handling ───────────────────────────────────────────────────

  const handlePhotoResult = useCallback(
    async (
      getter: () => Promise<{ uri: string; type: string; name: string } | null>,
    ) => {
      try {
        const file = await getter();
        if (!file) {
          sendToWeb({ type: 'PHOTO_CANCELLED' });
          return;
        }

        const publicUrl = await uploadAndGetUrl(file);
        sendToWeb({
          type: 'PHOTO_SELECTED',
          uri: file.uri,
          publicUrl,
        });
      } catch (err: any) {
        console.warn('Photo handling failed:', err);
        sendToWeb({ type: 'PHOTO_CANCELLED' });
      }
    },
    [sendToWeb],
  );

  const handleTakePhoto = useCallback(() => {
    handlePhotoResult(takePhoto);
  }, [handlePhotoResult]);

  const handlePickFromLibrary = useCallback(() => {
    handlePhotoResult(pickImageFromLibrary);
  }, [handlePhotoResult]);

  // ── Haptics mapping ──────────────────────────────────────────────────

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy') => {
    const map: Record<string, Haptics.ImpactFeedbackStyle> = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[style] ?? Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // ── Bridge message handler ───────────────────────────────────────────

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: BridgeMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as BridgeMessage;
      } catch {
        console.warn('Invalid bridge message:', event.nativeEvent.data);
        return;
      }

      switch (message.type) {
        case 'PICK_PHOTO':
          handlePickFromLibrary();
          break;
        case 'TAKE_PHOTO':
          handleTakePhoto();
          break;
        case 'HAPTIC':
          triggerHaptic(message.style);
          break;
        case 'SHARE':
          Share.share({
            url: message.url,
            message: message.url,
          });
          break;
        case 'NAVIGATE_BACK':
          router.back();
          break;
        default:
          console.warn('Unknown bridge message type:', (message as any).type);
      }
    },
    [handlePickFromLibrary, handleTakePhoto, triggerHaptic, router],
  );

  // ── Build headers with auth token ────────────────────────────────────

  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      SecureStore.getItemAsync(TOKEN_KEY).then((token) => {
        if (!cancelled && token) {
          setAuthHeaders({ Authorization: `Bearer ${token}` });
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Editor',
          headerBackTitle: 'Sites',
        }}
      />

      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{
            uri: editorUrl,
            headers: authHeaders,
          }}
          style={styles.webView}
          userAgent={`PearloomApp/${Platform.OS}`}
          injectedJavaScript={INJECTED_JS}
          onMessage={onMessage}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={(navState) =>
            setCanGoBack(navState.canGoBack)
          }
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState={false}
          originWhitelist={['https://*', 'http://*']}
          allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.olive} />
          </View>
        )}

        <CameraButton
          onTakePhoto={handleTakePhoto}
          onPickFromLibrary={handlePickFromLibrary}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
});

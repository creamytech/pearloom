import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  Platform,
  BackHandler,
  Share,
  Animated,
  Text,
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
import { colors, spacing } from '@/lib/theme';
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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;

  const editorUrl = `${API_BASE}/editor/${siteId}`;

  // ── Loading animations ──────────────────────────────────────────────

  useEffect(() => {
    // Logo entrance animation
    Animated.spring(logoScaleAnim, {
      toValue: 1,
      damping: 12,
      stiffness: 100,
      useNativeDriver: true,
    }).start();

    // Progress bar animation (indeterminate)
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    progressLoop.start();

    return () => progressLoop.stop();
  }, []);

  // When loading finishes, fade in WebView and fade out overlay
  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '70%', '100%'],
  });

  // ── Android back button ──────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
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
        {/* Progress bar at top */}
        {isLoading && (
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBar, { width: progressWidth }]}
            />
          </View>
        )}

        {/* WebView with fade transition */}
        <Animated.View style={[styles.webViewContainer, { opacity: fadeAnim }]}>
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
        </Animated.View>

        {/* Branded loading overlay */}
        {isLoading && (
          <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
            <Animated.View style={{ transform: [{ scale: logoScaleAnim }] }}>
              <View style={styles.loadingLogo}>
                <Text style={styles.loadingLogoText}>P</Text>
              </View>
              <Text style={styles.loadingBrandText}>Pearloom</Text>
            </Animated.View>
            <ActivityIndicator
              size="small"
              color={colors.olive}
              style={styles.loadingSpinner}
            />
            <Text style={styles.loadingHint}>Loading editor...</Text>
          </Animated.View>
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
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.creamDeep,
    zIndex: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.olive,
    borderRadius: 1.5,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    zIndex: 10,
  },
  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.olive,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  loadingLogoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  loadingBrandText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingSpinner: {
    marginTop: spacing.xl,
  },
  loadingHint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});

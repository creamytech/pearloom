import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthContext, useAuthState } from '@/lib/auth';
import { ONBOARDING_KEY } from './onboarding';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Configure how notifications are handled when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold_Italic,
  });

  const auth = useAuthState();
  const router = useRouter();
  const segments = useSegments();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true); // default true to avoid flash

  // Check onboarding status on mount
  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY)
      .then((value) => {
        setOnboardingDone(value === 'true');
      })
      .catch(() => {
        // If reading fails, assume done to avoid blocking
        setOnboardingDone(true);
      })
      .finally(() => {
        setOnboardingChecked(true);
      });
  }, []);

  // Throw font loading errors so the ErrorBoundary can catch them.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide splash once fonts + auth + onboarding state are ready.
  useEffect(() => {
    if (fontsLoaded && !auth.loading && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, auth.loading, onboardingChecked]);

  // Navigate to onboarding on first launch
  useEffect(() => {
    if (!fontsLoaded || auth.loading || !onboardingChecked) return;

    // If onboarding hasn't been completed, redirect there
    if (!onboardingDone && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [fontsLoaded, auth.loading, onboardingChecked, onboardingDone, segments, router]);

  if (!fontsLoaded || auth.loading || !onboardingChecked) {
    return null;
  }

  return (
    <AuthContext.Provider value={auth}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="auth/sign-in"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen name="editor/[siteId]" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="qr-scan"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </AuthContext.Provider>
  );
}

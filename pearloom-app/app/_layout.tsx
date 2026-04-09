import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
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

  // Throw font loading errors so the ErrorBoundary can catch them.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide splash once fonts + auth state are ready.
  useEffect(() => {
    if (fontsLoaded && !auth.loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, auth.loading]);

  if (!fontsLoaded || auth.loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={auth}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="editor/[siteId]" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthContext.Provider>
  );
}

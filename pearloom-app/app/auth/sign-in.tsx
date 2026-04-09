import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Design tokens
const CREAM = '#FAF7F2';
const OLIVE = '#A3B18A';
const OLIVE_DARK = '#8FA177';
const INK = '#1C1C1C';
const WARM_GRAY = '#8A8780';

export default function SignInScreen() {
  const router = useRouter();

  function handleGoogleSignIn() {
    // TODO: Integrate with expo-auth-session Google provider
    // For now, navigate to the main app for development
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={CREAM} />
      <View style={styles.container}>
        {/* Top section with logo and copy */}
        <View style={styles.topSection}>
          {/* Logo / Wordmark */}
          <View style={styles.logoContainer}>
            {/* TODO: Replace with actual Pearloom logo/SVG asset */}
            <View style={styles.logoMark}>
              <Text style={styles.logoIcon}>✦</Text>
            </View>
            {/* TODO: Replace fontFamily with serif font (e.g. 'PlayfairDisplay-Bold') */}
            <Text style={styles.wordmark}>Pearloom</Text>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Welcome to Pearloom</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            AI-powered celebration sites
          </Text>
        </View>

        {/* Bottom section with sign-in button and trust text */}
        <View style={styles.bottomSection}>
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
          >
            <FontAwesome
              name="google"
              size={18}
              color="#FFFFFF"
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          {/* Trust text */}
          <Text style={styles.trustText}>
            Free to start {'\u00B7'} No credit card
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: Platform.OS === 'android' ? 40 : 50,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: OLIVE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  wordmark: {
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-Bold')
    fontSize: 32,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.5,
  },
  heading: {
    // TODO: Replace with serif font (e.g. 'PlayfairDisplay-SemiBold')
    fontSize: 28,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 17,
    color: WARM_GRAY,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OLIVE,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  trustText: {
    fontSize: 14,
    color: WARM_GRAY,
    textAlign: 'center',
  },
});

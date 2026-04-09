import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
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

  // ── Animation values ───────────────────────────────────────────────────
  // Logo: drops in from top with spring bounce
  const logoTranslateY = useRef(new Animated.Value(-60)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Heading: fades in after logo
  const headingFade = useRef(new Animated.Value(0)).current;
  const headingSlide = useRef(new Animated.Value(16)).current;

  // Subtitle: fades in after heading
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(12)).current;

  // Button: slides up from bottom
  const buttonSlide = useRef(new Animated.Value(40)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  // Trust text: fades in last
  const trustFade = useRef(new Animated.Value(0)).current;

  // Pulsing glow on sign-in button
  const buttonGlow = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    // Sequence: Logo -> Heading -> Subtitle -> Button -> Trust
    Animated.stagger(180, [
      // 1. Logo springs in from top
      Animated.parallel([
        Animated.spring(logoTranslateY, {
          toValue: 0,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 2. Heading fades + slides in
      Animated.parallel([
        Animated.timing(headingFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(headingSlide, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),

      // 3. Subtitle fades + slides in
      Animated.parallel([
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 4. Button slides up
      Animated.parallel([
        Animated.spring(buttonSlide, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 5. Trust text fades in
      Animated.timing(trustFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulsing glow on button
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonGlow, {
          toValue: 0.35,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonGlow, {
          toValue: 0.15,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => glowLoop.stop();
  }, [
    logoTranslateY,
    logoScale,
    logoOpacity,
    headingFade,
    headingSlide,
    subtitleFade,
    subtitleSlide,
    buttonSlide,
    buttonFade,
    trustFade,
    buttonGlow,
  ]);

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
          {/* Logo / Wordmark — springs in from top */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { translateY: logoTranslateY },
                  { scale: logoScale },
                ],
              },
            ]}
          >
            <View style={styles.logoMark}>
              <Text style={styles.logoIcon}>✦</Text>
            </View>
            <Text style={styles.wordmark}>Pearloom</Text>
          </Animated.View>

          {/* Heading — fades in after logo */}
          <Animated.Text
            style={[
              styles.heading,
              {
                opacity: headingFade,
                transform: [{ translateY: headingSlide }],
              },
            ]}
          >
            Welcome to Pearloom
          </Animated.Text>

          {/* Subtitle — fades in after heading */}
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: subtitleFade,
                transform: [{ translateY: subtitleSlide }],
              },
            ]}
          >
            AI-powered celebration sites
          </Animated.Text>
        </View>

        {/* Bottom section with sign-in button and trust text */}
        <View style={styles.bottomSection}>
          {/* Button container with glow */}
          <Animated.View
            style={[
              styles.buttonWrapper,
              {
                opacity: buttonFade,
                transform: [{ translateY: buttonSlide }],
              },
            ]}
          >
            {/* Pulsing glow behind button */}
            <Animated.View
              style={[
                styles.buttonGlow,
                { opacity: buttonGlow },
              ]}
            />
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
          </Animated.View>

          {/* Trust text — fades in last */}
          <Animated.Text style={[styles.trustText, { opacity: trustFade }]}>
            Free to start {'\u00B7'} No credit card
          </Animated.Text>
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
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 32,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 28,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    color: WARM_GRAY,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  buttonGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 20,
    backgroundColor: OLIVE,
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
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  trustText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: WARM_GRAY,
    textAlign: 'center',
  },
});

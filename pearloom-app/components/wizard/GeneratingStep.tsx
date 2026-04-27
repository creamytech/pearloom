import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import { apiFetch, uploadPhoto } from '@/lib/api';
import type { WizardState } from '@/lib/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://pearloom.com';
const TOKEN_KEY = 'pearloom_auth_token';

const GENERATION_STEPS = [
  { message: 'Analyzing your photos...', icon: 'search' as const, duration: 6000 },
  { message: 'Crafting your story...', icon: 'book' as const, duration: 8000 },
  { message: 'Designing your visual identity...', icon: 'paint-brush' as const, duration: 10000 },
  { message: 'Building your site...', icon: 'magic' as const, duration: 8000 },
];

const TOTAL_FAKE_DURATION = GENERATION_STEPS.reduce((a, s) => a + s.duration, 0);

// Map API stream phases to step indices
const PHASE_MAP: Record<string, number> = {
  analyzing: 0,
  photos: 0,
  crafting: 1,
  story: 1,
  designing: 2,
  visual: 2,
  building: 3,
  finalizing: 3,
};

interface GeneratingStepProps {
  state: WizardState;
  onRetry: () => void;
}

export default function GeneratingStep({ state, onRetry }: GeneratingStepProps) {
  const router = useRouter();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiDone, setApiDone] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const messageFade = useRef(new Animated.Value(1)).current;
  const messageSlide = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const errorFade = useRef(new Animated.Value(0)).current;

  // Decorative orb animations
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;

  // Logo pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScaleAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [logoScaleAnim]);

  // Decorative orbs floating
  useEffect(() => {
    const orbAnimation = (anim: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      );

    const anim1 = orbAnimation(orb1Anim, 3000);
    const anim2 = orbAnimation(orb2Anim, 4000);
    const anim3 = orbAnimation(orb3Anim, 3500);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [orb1Anim, orb2Anim, orb3Anim]);

  // Step-by-step progress messages
  useEffect(() => {
    if (error || apiDone) return;

    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    GENERATION_STEPS.forEach((step, index) => {
      if (index === 0) return; // Already showing step 0
      elapsed += GENERATION_STEPS[index - 1].duration;

      const timer = setTimeout(() => {
        // Fade out old message
        Animated.parallel([
          Animated.timing(messageFade, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(messageSlide, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentStepIndex(index);
          messageSlide.setValue(20);
          // Fade in new message
          Animated.parallel([
            Animated.timing(messageFade, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(messageSlide, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, elapsed);

      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [error, apiDone, messageFade, messageSlide]);

  // Animated progress bar over total fake duration
  useEffect(() => {
    if (error) return;

    // Animate to 90% over fake duration, last 10% waits for API
    Animated.timing(progressAnim, {
      toValue: 0.9,
      duration: TOTAL_FAKE_DURATION,
      useNativeDriver: false,
    }).start();
  }, [error, progressAnim]);

  // Helper: try streaming endpoint for real-time progress
  const tryStreamGenerate = useCallback(
    async (
      photoUrls: string[],
      onPhase: (phase: string, progress: number) => void,
    ): Promise<{ siteId: string; domain: string } | null> => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const res = await fetch(`${API_BASE}/api/generate/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            photos: photoUrls,
            names: [state.name1.trim(), state.name2.trim()],
            occasion: state.occasion,
            vibe: state.vibeText,
            eventDate: state.eventDate?.toISOString() ?? null,
            venueName: state.venueName || null,
          }),
        });

        if (!res.ok) return null; // Fall back to non-streaming

        const text = await res.text();
        // Parse newline-delimited JSON (NDJSON) or SSE
        const lines = text.split('\n').filter((l) => l.trim());
        let result: { siteId: string; domain: string } | null = null;

        for (const line of lines) {
          try {
            const cleaned = line.startsWith('data:') ? line.slice(5).trim() : line;
            const parsed = JSON.parse(cleaned);

            if (parsed.phase) {
              const stepIdx = PHASE_MAP[parsed.phase] ?? -1;
              if (stepIdx >= 0) onPhase(parsed.phase, parsed.progress ?? 0);
            }
            if (parsed.siteId) {
              result = { siteId: parsed.siteId, domain: parsed.domain ?? '' };
            }
          } catch {
            // skip unparseable lines
          }
        }
        return result;
      } catch {
        return null; // Fall back to non-streaming
      }
    },
    [state],
  );

  // Fire the actual API call
  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        // Upload photos first
        const photoUrls: string[] = [];
        for (const photo of state.photos) {
          const uriParts = photo.uri.split('/');
          const fileName = uriParts[uriParts.length - 1] ?? 'photo.jpg';
          const result = await uploadPhoto({
            uri: photo.uri,
            type: 'image/jpeg',
            name: fileName,
          });
          photoUrls.push(result.publicUrl);
        }

        if (cancelled) return;

        // Try streaming endpoint first for real progress phases
        let response: { siteId: string; domain: string } | null = null;

        response = await tryStreamGenerate(photoUrls, (phase, progress) => {
          if (cancelled) return;
          const stepIdx = PHASE_MAP[phase] ?? -1;
          if (stepIdx >= 0 && stepIdx !== currentStepIndex) {
            // Animate to new step message
            Animated.parallel([
              Animated.timing(messageFade, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(messageSlide, {
                toValue: -20,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setCurrentStepIndex(stepIdx);
              messageSlide.setValue(20);
              Animated.parallel([
                Animated.timing(messageFade, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(messageSlide, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]).start();
            });
          }
          if (progress > 0) {
            progressAnim.setValue(Math.min(progress / 100, 0.9));
          }
        });

        // Fall back to standard endpoint if streaming failed
        if (!response) {
          response = await apiFetch<{ siteId: string; domain: string }>(
            '/api/generate',
            {
              method: 'POST',
              body: JSON.stringify({
                photos: photoUrls,
                names: [state.name1.trim(), state.name2.trim()],
                occasion: state.occasion,
                vibe: state.vibeText,
                eventDate: state.eventDate?.toISOString() ?? null,
                venueName: state.venueName || null,
              }),
            },
          );
        }

        if (cancelled) return;

        setSiteId(response.siteId);
        setApiDone(true);

        // Complete progress bar
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }).start(() => {
          // Show checkmark
          Animated.spring(checkmarkScale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }).start();

          // Haptic success
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Navigate to editor after a short celebration
          setTimeout(() => {
            if (!cancelled) {
              router.replace(`/editor/${response!.siteId}`);
            }
          }, 1800);
        });
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Something went wrong. Please try again.');

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        Animated.timing(errorFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }

    generate();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentStep = GENERATION_STEPS[currentStepIndex];

  const orb1Translate = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });
  const orb2Translate = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });
  const orb3Translate = orb3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressPct = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  if (error) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient
          colors={[colors.cream, colors.creamDeep, colors.cream]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.errorContainer, { opacity: errorFade }]}>
          <View style={styles.errorIconCircle}>
            <FontAwesome name="exclamation-triangle" size={32} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Generation Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <FontAwesome name="refresh" size={16} color={colors.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.cream, '#F0EDE4', colors.creamDeep, colors.cream]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative floating orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateY: orb1Translate }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateY: orb2Translate }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          { transform: [{ translateY: orb3Translate }] },
        ]}
      />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Animated logo / icon */}
        <View style={styles.logoArea}>
          {/* Outer ring */}
          <Animated.View
            style={[
              styles.logoRingOuter,
              { transform: [{ scale: logoScaleAnim }] },
            ]}
          />
          {/* Inner ring */}
          <Animated.View
            style={[
              styles.logoRingInner,
              {
                transform: [
                  {
                    scale: logoScaleAnim.interpolate({
                      inputRange: [1, 1.08],
                      outputRange: [1, 1.04],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Checkmark or icon */}
          {apiDone ? (
            <Animated.View
              style={[
                styles.logoCircle,
                styles.logoCircleSuccess,
                { transform: [{ scale: checkmarkScale }] },
              ]}
            >
              <FontAwesome name="check" size={36} color={colors.white} />
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.logoCircle,
                { transform: [{ scale: logoScaleAnim }] },
              ]}
            >
              <FontAwesome
                name={currentStep.icon}
                size={32}
                color={colors.white}
              />
            </Animated.View>
          )}
        </View>

        {/* Status message */}
        {apiDone ? (
          <View style={styles.messageArea}>
            <Text style={styles.successTitle}>
              {state.name1} & {state.name2}
            </Text>
            <Text style={styles.successSubtitle}>
              Your site is ready!
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.messageArea,
              {
                opacity: messageFade,
                transform: [{ translateY: messageSlide }],
              },
            ]}
          >
            <Text style={styles.statusMessage}>
              {currentStep.message}
            </Text>

            {/* Step dots */}
            <View style={styles.stepDotsRow}>
              {GENERATION_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i <= currentStepIndex
                      ? styles.stepDotActive
                      : styles.stepDotInactive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth },
              ]}
            >
              <LinearGradient
                colors={[colors.olive, colors.oliveDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>

        {/* Couple names */}
        {!apiDone && (
          <Text style={styles.couplePreview}>
            {state.name1} & {state.name2}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Floating orbs
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 180,
    height: 180,
    backgroundColor: colors.olive + '0C',
    top: SCREEN_HEIGHT * 0.08,
    left: -40,
  },
  orb2: {
    width: 120,
    height: 120,
    backgroundColor: colors.gold + '0A',
    top: SCREEN_HEIGHT * 0.15,
    right: -20,
  },
  orb3: {
    width: 150,
    height: 150,
    backgroundColor: colors.plum + '08',
    bottom: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.1,
  },

  centerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    width: '100%',
  },

  // Logo area
  logoArea: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl + spacing.lg,
  },
  logoRingOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: colors.olive + '20',
  },
  logoRingInner: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.olive + '08',
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.olive,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.olive,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  logoCircleSuccess: {
    backgroundColor: colors.success,
    ...Platform.select({
      ios: {
        shadowColor: colors.success,
      },
    }),
  },

  // Message area
  messageArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    minHeight: 70,
  },
  statusMessage: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
  },
  stepDotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    backgroundColor: colors.olive,
  },
  stepDotInactive: {
    backgroundColor: colors.olive + '25',
  },

  // Success message
  successTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: colors.olive,
    textAlign: 'center',
  },

  // Progress bar
  progressContainer: {
    width: '100%',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.olive + '15',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },

  // Couple preview
  couplePreview: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },

  // Error state
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  errorTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.olive,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl + spacing.xl,
    borderRadius: radius.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.olive,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  retryButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
});

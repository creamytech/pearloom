import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Design tokens
const CREAM = '#FAF7F2';
const OLIVE = '#A3B18A';
const OLIVE_LIGHT = '#C8D5B9';
const OLIVE_DARK = '#8FA177';
const INK = '#1C1C1C';
const WARM_GRAY = '#8A8780';

export const ONBOARDING_KEY = 'pearloom_onboarding_complete';

interface OnboardingStep {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconBg: string;
  title: string;
  subtitle: string;
  decorIcon1: string;
  decorIcon2: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: 'camera',
    iconBg: OLIVE,
    title: 'Upload your photos',
    subtitle:
      'Our AI analyzes your best moments and weaves them into a stunning celebration site, automatically.',
    decorIcon1: 'image',
    decorIcon2: 'magic',
  },
  {
    icon: 'paint-brush',
    iconBg: '#C4A96A',
    title: 'Set your vibe',
    subtitle:
      'Choose colors, fonts, and moods. Our AI generates a unique design that feels authentically yours.',
    decorIcon1: 'th-large',
    decorIcon2: 'diamond',
  },
  {
    icon: 'share-alt',
    iconBg: '#6D597A',
    title: 'Share with guests',
    subtitle:
      'Send beautiful invitations, track RSVPs, manage your guest list, and keep everyone in the loop.',
    decorIcon1: 'link',
    decorIcon2: 'envelope-o',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Page-level animations
  const fadeAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(STEPS.map(() => new Animated.Value(40))).current;
  const iconScaleAnims = useRef(STEPS.map(() => new Animated.Value(0.3))).current;
  const iconRotateAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

  // Decor icon animations
  const decorFade1 = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const decorFade2 = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const decorSlide1 = useRef(STEPS.map(() => new Animated.Value(20))).current;
  const decorSlide2 = useRef(STEPS.map(() => new Animated.Value(20))).current;

  // Bottom section animations
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(30)).current;
  const dotsFade = useRef(new Animated.Value(0)).current;

  // Floating pulse on icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const animateStep = useCallback(
    (index: number) => {
      // Reset target animations
      fadeAnims[index].setValue(0);
      slideAnims[index].setValue(40);
      iconScaleAnims[index].setValue(0.3);
      iconRotateAnims[index].setValue(0);
      decorFade1[index].setValue(0);
      decorFade2[index].setValue(0);
      decorSlide1[index].setValue(20);
      decorSlide2[index].setValue(20);

      Animated.stagger(120, [
        // Icon springs in
        Animated.parallel([
          Animated.spring(iconScaleAnims[index], {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotateAnims[index], {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Text fades + slides in
        Animated.parallel([
          Animated.timing(fadeAnims[index], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnims[index], {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Decor icons float in
        Animated.parallel([
          Animated.timing(decorFade1[index], {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(decorSlide1[index], {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(decorFade2[index], {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(decorSlide2[index], {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    },
    [fadeAnims, slideAnims, iconScaleAnims, iconRotateAnims, decorFade1, decorFade2, decorSlide1, decorSlide2]
  );

  useEffect(() => {
    // Animate bottom section on mount
    Animated.parallel([
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonSlide, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dotsFade, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate first step
    animateStep(0);

    // Start subtle pulse loop on icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [animateStep, buttonFade, buttonSlide, dotsFade, pulseAnim]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < STEPS.length) {
      setActiveIndex(newIndex);
      animateStep(newIndex);
    }
  }

  async function completeOnboarding() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/auth/sign-in');
  }

  function handleSkip() {
    completeOnboarding();
  }

  function handleGetStarted() {
    completeOnboarding();
  }

  function handleNext() {
    if (activeIndex < STEPS.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  }

  const isLastStep = activeIndex === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={CREAM} />

      {/* Skip button */}
      {!isLastStep && (
        <Animated.View style={[styles.skipContainer, { opacity: buttonFade }]}>
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {STEPS.map((step, index) => {
          const iconRotation = iconRotateAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['-20deg', '0deg'],
          });

          return (
            <View key={index} style={styles.page}>
              {/* Illustration area */}
              <View style={styles.illustrationArea}>
                {/* Decorative background circle */}
                <View style={[styles.decorCircleOuter, { borderColor: step.iconBg + '20' }]} />
                <View style={[styles.decorCircleInner, { backgroundColor: step.iconBg + '10' }]} />

                {/* Floating decor icons */}
                <Animated.View
                  style={[
                    styles.decorIcon1,
                    {
                      opacity: decorFade1[index],
                      transform: [{ translateY: decorSlide1[index] }],
                    },
                  ]}
                >
                  <View style={[styles.decorIconBubble, { backgroundColor: step.iconBg + '18' }]}>
                    <FontAwesome name={step.decorIcon1} size={18} color={step.iconBg} />
                  </View>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.decorIcon2,
                    {
                      opacity: decorFade2[index],
                      transform: [{ translateY: decorSlide2[index] }],
                    },
                  ]}
                >
                  <View style={[styles.decorIconBubble, { backgroundColor: step.iconBg + '18' }]}>
                    <FontAwesome name={step.decorIcon2} size={18} color={step.iconBg} />
                  </View>
                </Animated.View>

                {/* Main icon */}
                <Animated.View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: step.iconBg },
                    {
                      transform: [
                        { scale: Animated.multiply(iconScaleAnims[index], pulseAnim) },
                        { rotate: iconRotation },
                      ],
                    },
                  ]}
                >
                  <FontAwesome name={step.icon} size={48} color="#FFFFFF" />
                </Animated.View>
              </View>

              {/* Text content */}
              <Animated.View
                style={[
                  styles.textContent,
                  {
                    opacity: fadeAnims[index],
                    transform: [{ translateY: slideAnims[index] }],
                  },
                ]}
              >
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom section: dots + button */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: buttonFade,
            transform: [{ translateY: buttonSlide }],
          },
        ]}
      >
        {/* Dots indicator */}
        <Animated.View style={[styles.dotsRow, { opacity: dotsFade }]}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </Animated.View>

        {/* Action button */}
        {isLastStep ? (
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <FontAwesome name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <FontAwesome name="arrow-right" size={14} color={OLIVE} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollView: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: WARM_GRAY,
    fontFamily: 'Inter_500Medium',
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  // Illustration area
  illustrationArea: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  decorCircleOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
  },
  decorCircleInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Floating decor icons
  decorIcon1: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  decorIcon2: {
    position: 'absolute',
    bottom: 20,
    left: 5,
  },
  decorIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Text content
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  stepTitle: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 28,
    color: INK,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: WARM_GRAY,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  // Bottom section
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'android' ? 32 : 40,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  dot: {
    borderRadius: 6,
    height: 8,
  },
  dotActive: {
    width: 28,
    backgroundColor: OLIVE,
  },
  dotInactive: {
    width: 8,
    backgroundColor: OLIVE_LIGHT,
  },

  // Buttons
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: OLIVE,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  getStartedText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: OLIVE_LIGHT + '60',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: OLIVE_LIGHT,
  },
  nextButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: OLIVE_DARK,
    fontSize: 17,
  },
});

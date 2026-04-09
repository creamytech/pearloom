import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import type { WizardState } from '@/lib/types';

import PhotosStep from '@/components/wizard/PhotosStep';
import DetailsStep from '@/components/wizard/DetailsStep';
import GeneratingStep from '@/components/wizard/GeneratingStep';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { key: 'photos', label: 'Photos', icon: 'camera' as const },
  { key: 'details', label: 'Details', icon: 'pencil' as const },
  { key: 'generate', label: 'Generate', icon: 'magic' as const },
];

export default function WizardContainer() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [wizardState, setWizardState] = useState<WizardState>({
    photos: [],
    name1: '',
    name2: '',
    occasion: '',
    vibeText: '',
    selectedVibes: [],
    eventDate: null,
    venueName: '',
  });

  const updateState = useCallback(
    (updates: Partial<WizardState>) => {
      setWizardState((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const animateToStep = useCallback(
    (toStep: number) => {
      const direction = toStep > currentStep ? -1 : 1;

      // Slide out current
      Animated.timing(slideAnim, {
        toValue: direction * SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(toStep);
        // Position new step on the opposite side
        slideAnim.setValue(-direction * SCREEN_WIDTH);
        // Slide new step in
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 12,
          tension: 65,
          useNativeDriver: true,
        }).start();
      });

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: toStep / (STEPS.length - 1),
        duration: 400,
        useNativeDriver: false,
      }).start();
    },
    [currentStep, slideAnim, progressAnim],
  );

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateToStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateToStep(currentStep - 1);
    } else {
      router.back();
    }
  }

  function handleGenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateToStep(2);
  }

  const canContinue = (() => {
    if (currentStep === 0) return wizardState.photos.length > 0;
    if (currentStep === 1) {
      return (
        wizardState.name1.trim().length > 0 &&
        wizardState.name2.trim().length > 0 &&
        wizardState.occasion.length > 0
      );
    }
    return false;
  })();

  const isGenerating = currentStep === 2;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header: Step indicator */}
      {!isGenerating && (
        <View style={styles.header}>
          {/* Back button */}
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={12}
          >
            <FontAwesome name="chevron-left" size={16} color={colors.ink} />
          </Pressable>

          {/* Step dots */}
          <View style={styles.stepsRow}>
            {STEPS.map((step, i) => {
              const isActive = i === currentStep;
              const isCompleted = i < currentStep;
              return (
                <View key={step.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      isActive && styles.stepDotActive,
                      isCompleted && styles.stepDotCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <FontAwesome name="check" size={10} color={colors.white} />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          (isActive || isCompleted) && styles.stepNumberActive,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Spacer to balance back button */}
          <View style={styles.backButton} />
        </View>
      )}

      {/* Progress bar */}
      {!isGenerating && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
      )}

      {/* Step content */}
      <Animated.View
        style={[
          styles.content,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {currentStep === 0 && (
          <PhotosStep
            photos={wizardState.photos}
            onUpdatePhotos={(photos) => updateState({ photos })}
          />
        )}
        {currentStep === 1 && (
          <DetailsStep
            state={wizardState}
            onUpdate={updateState}
            onGenerate={handleGenerate}
          />
        )}
        {currentStep === 2 && (
          <GeneratingStep
            state={wizardState}
            onRetry={() => animateToStep(1)}
          />
        )}
      </Animated.View>

      {/* Bottom navigation buttons (not shown during generation) */}
      {!isGenerating && (
        <View style={styles.bottomBar}>
          {currentStep === 0 && (
            <Pressable
              onPress={() => router.back()}
              style={styles.skipLink}
            >
              <Text style={styles.skipText}>Start from Template instead</Text>
            </Pressable>
          )}

          {currentStep < 2 && (
            <Pressable
              onPress={currentStep === 1 ? handleGenerate : handleNext}
              disabled={!canContinue}
              style={[
                styles.nextButton,
                !canContinue && styles.nextButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  !canContinue && styles.nextButtonTextDisabled,
                ]}
              >
                {currentStep === 1 ? 'Generate My Site' : 'Continue'}
              </Text>
              <FontAwesome
                name={currentStep === 1 ? 'magic' : 'arrow-right'}
                size={14}
                color={canContinue ? colors.white : colors.muted}
              />
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.creamDeep,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepDotActive: {
    borderColor: colors.olive,
    backgroundColor: colors.white,
  },
  stepDotCompleted: {
    backgroundColor: colors.olive,
    borderColor: colors.olive,
  },
  stepNumber: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.muted,
  },
  stepNumberActive: {
    color: colors.olive,
  },
  stepLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  stepLabelActive: {
    fontFamily: fonts.bodySemibold,
    color: colors.oliveDeep,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.creamDeep,
    marginHorizontal: spacing.xl,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.olive,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  skipLink: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.olive,
    width: '100%',
    paddingVertical: 18,
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
  nextButtonDisabled: {
    backgroundColor: colors.creamDeep,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.white,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  nextButtonTextDisabled: {
    color: colors.muted,
  },
});

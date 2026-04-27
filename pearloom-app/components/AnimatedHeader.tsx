import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

// Design tokens
const CREAM = '#FAF7F2';
const INK = '#1C1C1C';
const WARM_GRAY = '#8A8780';

const HEADER_MAX_HEIGHT = 100;
const HEADER_MIN_HEIGHT = 56;
const TITLE_MAX_SIZE = 28;
const TITLE_MIN_SIZE = 18;

interface AnimatedHeaderProps {
  title: string;
  subtitle?: string;
  scrollY?: Animated.Value;
}

export default function AnimatedHeader({
  title,
  subtitle,
  scrollY,
}: AnimatedHeaderProps) {
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(12)).current;
  const subtitleSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
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
    ]).start();
  }, [titleFade, subtitleFade, titleSlide, subtitleSlide]);

  // If scrollY is provided, interpolate header height and title size
  const headerHeight = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        extrapolate: 'clamp',
      })
    : HEADER_MAX_HEIGHT;

  const titleScale = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, TITLE_MIN_SIZE / TITLE_MAX_SIZE],
        extrapolate: 'clamp',
      })
    : 1;

  const subtitleOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 40],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 1;

  const blurOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 60],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
      {/* Glass blur background that fades in on scroll */}
      {Platform.OS === 'ios' && scrollY && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}>
          <BlurView
            intensity={60}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.blurBg]}
          />
        </Animated.View>
      )}
      {Platform.OS === 'android' && scrollY && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.androidBlurFallback,
            { opacity: blurOpacity },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.textContainer,
          {
            transform: [{ scale: titleScale }],
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleFade,
              transform: [{ translateY: titleSlide }],
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>

        {subtitle && (
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: Animated.multiply(subtitleFade, subtitleOpacity),
                transform: [{ translateY: subtitleSlide }],
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Animated.Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: CREAM,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
    overflow: 'hidden',
  },
  blurBg: {
    backgroundColor: 'rgba(250, 247, 242, 0.75)',
  },
  androidBlurFallback: {
    backgroundColor: 'rgba(250, 247, 242, 0.92)',
  },
  textContainer: {
    transformOrigin: 'left center',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: TITLE_MAX_SIZE,
    color: INK,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: WARM_GRAY,
    marginTop: 4,
  },
});

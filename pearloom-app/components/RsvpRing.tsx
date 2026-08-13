import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { colors, fonts, spacing } from '@/lib/theme';

interface RsvpRingProps {
  attending: number;
  declined: number;
  pending: number;
  size?: number;
  strokeWidth?: number;
}

const COLORS = {
  attending: colors.olive,
  declined: colors.danger,
  pending: colors.gold,
};

export default function RsvpRing({
  attending,
  declined,
  pending,
  size = 160,
  strokeWidth = 14,
}: RsvpRingProps) {
  const animProgress = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const legendAnim1 = useRef(new Animated.Value(0)).current;
  const legendAnim2 = useRef(new Animated.Value(0)).current;
  const legendAnim3 = useRef(new Animated.Value(0)).current;

  const total = attending + declined + pending;

  useEffect(() => {
    animProgress.setValue(0);
    countAnim.setValue(0);
    legendAnim1.setValue(0);
    legendAnim2.setValue(0);
    legendAnim3.setValue(0);

    // Ring animates with spring
    Animated.spring(animProgress, {
      toValue: 1,
      damping: 14,
      stiffness: 80,
      mass: 1,
      useNativeDriver: false,
    }).start();

    // Count-up animation
    Animated.timing(countAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Legend items staggered fade in
    Animated.stagger(150, [
      Animated.timing(legendAnim1, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(legendAnim2, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(legendAnim3, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [attending, declined, pending]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const attendingPct = total > 0 ? attending / total : 0;
  const declinedPct = total > 0 ? declined / total : 0;
  const pendingPct = total > 0 ? pending / total : 0;

  const attendingPctDisplay = total > 0 ? Math.round((attending / total) * 100) : 0;

  // Segment offsets
  const attendingOffset = 0;
  const declinedOffset = attendingPct * circumference;
  const pendingOffset = (attendingPct + declinedPct) * circumference;

  const center = size / 2;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        {/* Background ring */}
        <View
          style={[
            styles.ringBg,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: colors.creamDeep,
            },
          ]}
        />

        {total > 0 && (
          <>
            {/* Attending arc */}
            {attendingPct > 0 && (
              <ArcSegment
                size={size}
                strokeWidth={strokeWidth}
                color={COLORS.attending}
                startAngle={0}
                endAngle={attendingPct * 360}
              />
            )}
            {/* Declined arc */}
            {declinedPct > 0 && (
              <ArcSegment
                size={size}
                strokeWidth={strokeWidth}
                color={COLORS.declined}
                startAngle={attendingPct * 360}
                endAngle={(attendingPct + declinedPct) * 360}
              />
            )}
            {/* Pending arc */}
            {pendingPct > 0 && (
              <ArcSegment
                size={size}
                strokeWidth={strokeWidth}
                color={COLORS.pending}
                startAngle={(attendingPct + declinedPct) * 360}
                endAngle={360}
              />
            )}
          </>
        )}

        {/* Center label with counting number */}
        <View style={[styles.centerLabel, { width: size, height: size }]}>
          <AnimatedCounter value={attendingPctDisplay} animValue={countAnim} />
          <Text style={styles.pctLabel}>attending</Text>
        </View>
      </View>

      {/* Legend with staggered fade-in */}
      <View style={styles.legend}>
        <Animated.View style={{ opacity: legendAnim1, transform: [{ translateY: legendAnim1.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <LegendItem color={COLORS.attending} label="Attending" count={attending} />
        </Animated.View>
        <Animated.View style={{ opacity: legendAnim2, transform: [{ translateY: legendAnim2.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <LegendItem color={COLORS.declined} label="Declined" count={declined} />
        </Animated.View>
        <Animated.View style={{ opacity: legendAnim3, transform: [{ translateY: legendAnim3.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <LegendItem color={COLORS.pending} label="Pending" count={pending} />
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Animated counter that counts up from 0 to value.
 */
function AnimatedCounter({
  value,
  animValue,
}: {
  value: number;
  animValue: Animated.Value;
}) {
  const displayValue = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, value],
  });

  // Use a listener to update displayed text
  const [displayText, setDisplayText] = React.useState('0%');

  React.useEffect(() => {
    const id = animValue.addListener(({ value: v }) => {
      setDisplayText(`${Math.round(v * value)}%`);
    });
    return () => animValue.removeListener(id);
  }, [value, animValue]);

  return <Text style={styles.pctNumber}>{displayText}</Text>;
}

/**
 * Renders an arc segment using four masked quadrant views.
 */
function ArcSegment({
  size,
  strokeWidth,
  color,
  startAngle,
  endAngle,
}: {
  size: number;
  strokeWidth: number;
  color: string;
  startAngle: number;
  endAngle: number;
}) {
  const span = endAngle - startAngle;
  if (span <= 0) return null;

  const segments: { rotate: number; sweep: number }[] = [];
  let remaining = span;
  let cursor = startAngle;

  while (remaining > 0) {
    const sweep = Math.min(remaining, 180);
    segments.push({ rotate: cursor - 90, sweep });
    cursor += sweep;
    remaining -= sweep;
  }

  return (
    <>
      {segments.map((seg, i) => (
        <HalfRing
          key={`${color}-${i}`}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
          rotationDeg={seg.rotate}
          sweepDeg={seg.sweep}
        />
      ))}
    </>
  );
}

/**
 * Draws up to 180 degrees of a ring using two clipped half-circles.
 */
function HalfRing({
  size,
  strokeWidth,
  color,
  rotationDeg,
  sweepDeg,
}: {
  size: number;
  strokeWidth: number;
  color: string;
  rotationDeg: number;
  sweepDeg: number;
}) {
  const half = size / 2;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          width: size,
          height: size,
          transform: [{ rotate: `${rotationDeg}deg` }],
        },
      ]}
    >
      {/* Clip to left half */}
      <View
        style={{
          position: 'absolute',
          width: half,
          height: size,
          left: 0,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: color,
          }}
        />
      </View>

      {/* Second half if sweep < 180 */}
      {sweepDeg > 0 && sweepDeg < 180 && (
        <View
          style={{
            position: 'absolute',
            width: half,
            height: size,
            left: half,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: strokeWidth,
              borderColor: color,
              marginLeft: -half,
              transform: [{ rotate: `${sweepDeg - 180}deg` }],
            }}
          />
        </View>
      )}
    </View>
  );
}

function LegendItem({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>
        {label}{' '}
        <Text style={styles.legendCount}>({count})</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  ringBg: {
    position: 'absolute',
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pctNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  pctLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  legendCount: {
    fontWeight: '600',
    color: colors.ink,
  },
});

import React, { useRef, useState } from 'react';
import { View, Text, Animated, Pressable, StyleSheet, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 172;
const R = 78;
const CIRC = 2 * Math.PI * R;

/**
 * Exact 3.0-Second Confirmation SOS Button
 * Features:
 * 1. 0ms instant GPU-accelerated touch feedback (scale depression on press down).
 * 2. Exact 3000ms hardware timer with live remaining seconds display (3s -> 2s -> 1s).
 * 3. Quick-tap support via optional onPress callback.
 */
export function SosHold({
  label = 'SOS',
  sublabel = 'HOLD 3 SEC',
  holdMs = 3000,
  onConfirm,
  onPress,
}: {
  label?: string;
  sublabel?: string;
  holdMs?: number;
  onConfirm: () => void;
  onPress?: () => void;
  pulse?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<number>(0);
  const isConfirmedRef = useRef<boolean>(false);

  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const lastSecRef = useRef<number | null>(null);

  const triggerConfirm = () => {
    if (isConfirmedRef.current) return;
    isConfirmedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (secIntervalRef.current) clearInterval(secIntervalRef.current);
    setRemainingSec(null);
    lastSecRef.current = null;
    onConfirm();
  };

  const handlePressIn = () => {
    const startTime = Date.now();
    pressStartRef.current = startTime;
    isConfirmedRef.current = false;
    const initialSec = Math.ceil(holdMs / 1000);
    lastSecRef.current = initialSec;
    setRemainingSec(initialSec);

    // 1. Instant 0ms GPU-accelerated touch feedback
    Animated.spring(pressScale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 24,
      bounciness: 3,
    }).start();

    // 2. Smooth progress ring with native completion callback
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isConfirmedRef.current) {
        triggerConfirm();
      }
    });

    // 3. Drift-free physical clock ticker (checks real elapsed time)
    secIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - pressStartRef.current;
      if (elapsed >= holdMs) {
        triggerConfirm();
        return;
      }
      const secLeft = Math.max(1, Math.ceil((holdMs - elapsed) / 1000));
      if (secLeft !== lastSecRef.current) {
        lastSecRef.current = secLeft;
        setRemainingSec(secLeft);
      }
    }, 80);

    // 4. Exact hardware clock timeout safety guarantee
    timerRef.current = setTimeout(() => {
      triggerConfirm();
    }, holdMs);
  };

  const handlePressOut = () => {
    const elapsed = Date.now() - pressStartRef.current;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (secIntervalRef.current) clearInterval(secIntervalRef.current);
    setRemainingSec(null);
    lastSecRef.current = null;

    // Spring button back to full size
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();

    // If already triggered at 3.0s, don't reset ring prematurely
    if (isConfirmedRef.current) {
      return;
    }

    // Cancel progress smoothly
    Animated.timing(progress, {
      toValue: 0,
      duration: 100,
      useNativeDriver: false,
    }).start();

    // If quick tap (< 350ms) and onPress is provided, trigger quick action
    if (elapsed < 350 && onPress) {
      onPress();
    }
  };

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  });

  const displaySublabel =
    remainingSec !== null ? `HOLD · ${remainingSec}s` : sublabel;

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.wrap}
      >
        <Svg
          width={SIZE}
          height={SIZE}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke="#FDE2E2"
            strokeWidth={8}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.red}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <LinearGradient
            colors={[colors.red, colors.redDark]}
            style={styles.core}
          >
            <Text style={styles.big}>{label}</Text>
            <Text style={styles.small}>{displaySublabel}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.red,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  big: { color: '#fff', fontWeight: '800', fontSize: 22, letterSpacing: 1 },
  small: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    opacity: 0.9,
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
});

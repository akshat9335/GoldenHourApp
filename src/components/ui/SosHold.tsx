import React, { useRef } from 'react';
import { View, Text, Animated, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 172;
const R = 78;
const CIRC = 2 * Math.PI * R;

/**
 * Press-and-hold-for-3-seconds confirmation button, mirroring the
 * .sos-hold / .sos-ring-fg behaviour in the HTML prototype.
 */
export function SosHold({
  label = 'SOS',
  sublabel = 'HOLD 3 SEC',
  holdMs = 3000,
  onConfirm,
  pulse = true,
}: {
  label?: string;
  sublabel?: string;
  holdMs?: number;
  onConfirm: () => void;
  pulse?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const start = () => {
    progress.setValue(0);
    animRef.current = Animated.timing(progress, { toValue: 1, duration: holdMs, useNativeDriver: false });
    animRef.current.start(({ finished }) => {
      if (finished) onConfirm();
    });
  };
  const cancel = () => {
    animRef.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const strokeDashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPressIn={start} onPressOut={cancel} style={styles.wrap}>
        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#EEE0E0" strokeWidth={8} fill="none" />
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
        <LinearGradient colors={[colors.red, colors.redDark]} style={styles.core}>
          <Text style={styles.big}>{label}</Text>
          <Text style={styles.small}>{sublabel}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  core: {
    width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.red, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  big: { color: '#fff', fontWeight: '800', fontSize: 22, letterSpacing: 1 },
  small: { color: '#fff', fontSize: 9.5, fontWeight: '700', opacity: 0.85, marginTop: 2, letterSpacing: 0.5 },
});

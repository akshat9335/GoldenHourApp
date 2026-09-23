import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadow } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'blue' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = loading ? <ActivityIndicator color={variant === 'secondary' ? colors.ink : '#fff'} /> : (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.text, variant === 'secondary' && { color: colors.ink }, variant === 'ghost' && { color: colors.inkSoft }]}
    >
      {title}
    </Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.primaryWrapper,
          style,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient colors={[colors.red, colors.redDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, shadow.sos]}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'blue' && { backgroundColor: colors.blue },
        variant === 'success' && { backgroundColor: colors.emerald || '#10B981' },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryWrapper: { width: '100%' },
  base: { borderRadius: radii.lg, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', width: '100%' },
  secondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent', paddingVertical: 12 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  text: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
});

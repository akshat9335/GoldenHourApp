import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

export function Row({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const Wrap = onPress ? Pressable : View;
  return <Wrap onPress={onPress} style={[styles.row, style]}>{children}</Wrap>;
}

type PillColor = 'success' | 'amber' | 'orange' | 'red' | 'blue' | 'grey';
const pillBg: Record<PillColor, string> = {
  success: colors.successBg, amber: colors.amberBg, orange: colors.orangeBg,
  red: colors.redGlow, blue: colors.blueBg, grey: colors.grey,
};
const pillFg: Record<PillColor, string> = {
  success: colors.success, amber: colors.amber, orange: colors.orange,
  red: colors.red, blue: colors.blue, grey: colors.inkSoft,
};
export function Pill({ children, color = 'grey' }: { children: React.ReactNode; color?: PillColor }) {
  return (
    <View style={[styles.pill, { backgroundColor: pillBg[color] }]}>
      <Text style={[styles.pillText, { color: pillFg[color] }]}>{children}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange?.(!on)} style={[styles.toggle, { backgroundColor: on ? colors.red : colors.line }]}>
      <View style={[styles.knob, on ? { right: 2 } : { left: 2 }]} />
    </Pressable>
  );
}

export function LabelEyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function HTitle({ children, size = 17 }: { children: React.ReactNode; size?: number }) {
  return <Text style={[styles.hTitle, { fontSize: size }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.xl, borderWidth: 1, borderColor: '#EEF1F5', ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontWeight: '700', fontSize: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff' },
  chipSelected: { backgroundColor: colors.red, borderColor: colors.red },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
  toggle: { width: 40, height: 22, borderRadius: 100, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute' },
  eyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  hTitle: { fontWeight: '700', color: colors.ink },
});

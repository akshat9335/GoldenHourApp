import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

export function Stepper({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <View style={{ paddingLeft: 22 }}>
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <View key={s} style={[styles.item, i === steps.length - 1 && { paddingBottom: 0 }]}>
            {i < steps.length - 1 && (
              <View style={[styles.line, { backgroundColor: done ? colors.success : colors.line }]} />
            )}
            <View
              style={[
                styles.dot,
                { backgroundColor: done ? colors.success : active ? colors.red : colors.line },
                active && { shadowColor: colors.red, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
              ]}
            />
            <Text style={{ fontSize: 12.5, fontWeight: done || active ? '700' : '500', color: done || active ? colors.ink : colors.inkFaint }}>
              {s}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingBottom: 22, position: 'relative' },
  dot: { position: 'absolute', left: -22, top: 2, width: 14, height: 14, borderRadius: 7 },
  line: { position: 'absolute', left: -16, top: 14, width: 2, bottom: -8 },
});

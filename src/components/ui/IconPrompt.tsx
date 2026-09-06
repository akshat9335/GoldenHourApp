import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { HTitle } from './Atoms';

export function IconPrompt({
  icon,
  bg,
  title,
  desc,
  size = 80,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  desc: string;
  size?: number;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg }]}>
        {icon}
      </View>
      <HTitle size={19}>{title}</HTitle>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  desc: { color: colors.inkSoft, fontSize: 12.5, marginTop: 8, lineHeight: 19, textAlign: 'center', paddingHorizontal: 8 },
});

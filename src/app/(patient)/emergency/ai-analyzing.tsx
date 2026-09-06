import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, HTitle } from '@/components/ui';

export default function AiAnalyzing() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(patient)/emergency/ai-result'), 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.red} style={{ marginBottom: 20 }} />
      <HTitle size={16}>Analyzing symptoms…</HTitle>
      <Text style={styles.sub}>Cross-referencing vitals, symptoms and history</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkFaint, fontSize: 11.5, marginTop: 8, textAlign: 'center' },
});

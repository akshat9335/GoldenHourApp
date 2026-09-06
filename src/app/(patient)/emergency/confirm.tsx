import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, severityLabel, severityPillColor } from '@/constants/theme';
import { Screen, Button, Pill, HTitle } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Confirm() {
  const aiSeverity = useAppStore((s) => s.aiSeverity);
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <Pill color={severityPillColor(aiSeverity)}>{severityLabel(aiSeverity)} SEVERITY</Pill>
      <HTitle size={18}>Confirm Emergency Dispatch</HTitle>
      <Text style={styles.desc}>
        This will dispatch an ambulance to your location and alert St. Martha's Hospital. Hold the button below to confirm — this prevents accidental activation.
      </Text>
      <Button title="Continue to Hold-to-Confirm" onPress={() => router.push('/(patient)/emergency/hold-confirm')} style={{ marginTop: 22 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { color: colors.inkSoft, fontSize: 12, marginTop: 8, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});

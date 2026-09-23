import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, severityLabel, severityPillColor } from '@/constants/theme';
import { Screen, Button, Pill, HTitle } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Confirm() {
  const aiSeverity = useAppStore((s) => s.aiSeverity);
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const hospitalName = aiTriageResult?.recommendedHospital || 'the nearest Trauma ER';

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <Pill color={severityPillColor(aiSeverity)}>{severityLabel(aiSeverity)} SEVERITY</Pill>
      <HTitle size={18}>Confirm Emergency Dispatch</HTitle>
      <Text style={styles.desc}>
        This will dispatch a high-priority rescue ambulance to your live coordinates and alert {hospitalName}. Hold the button below to confirm — this prevents accidental activation.
      </Text>
      <Button title="Continue to Hold-to-Confirm" onPress={() => router.push('/(patient)/emergency/hold-confirm')} style={{ marginTop: 22 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { color: colors.inkSoft, fontSize: 12, marginTop: 8, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});

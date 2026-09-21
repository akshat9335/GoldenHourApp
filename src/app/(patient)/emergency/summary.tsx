import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Summary() {
  const selectedType = useAppStore((s) => s.selectedType);
  const description = useAppStore((s) => s.description);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const displayLoc =
    locationAddress ||
    (lastKnownLocation
      ? `${lastKnownLocation.latitude.toFixed(4)}°N, ${lastKnownLocation.longitude.toFixed(4)}°E`
      : 'Live GPS Active · Current Device Location');

  return (
    <Screen>
      <TopBar title="Emergency Summary" />
      <Card style={styles.card}>
        <LabelEyebrow>EMERGENCY TYPE</LabelEyebrow>
        <Text style={styles.value}>{selectedType || 'General Emergency'}</Text>
        <LabelEyebrow>DESCRIPTION</LabelEyebrow>
        <Text style={styles.desc}>{description || 'No description provided (Location only dispatch)'}</Text>
        <LabelEyebrow>LOCATION</LabelEyebrow>
        <Text style={styles.desc}>{displayLoc}</Text>
      </Card>
      <Button title="Run AI Assessment" onPress={() => router.push('/(patient)/emergency/ai-analyzing')} />
      <Button title="Skip — Confirm Directly" variant="secondary" style={{ marginTop: 10 }} onPress={() => router.push('/(patient)/emergency/review')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  value: { fontWeight: '700', fontSize: 14, marginBottom: 12, color: colors.ink },
  desc: { fontSize: 12.5, color: colors.inkSoft, marginBottom: 12, lineHeight: 18 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, LabelEyebrow, Pill } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Summary() {
  const selectedType = useAppStore((s) => s.selectedType);
  const description = useAppStore((s) => s.description);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const isGpsLocked = !!lastKnownLocation;

  return (
    <Screen>
      <TopBar title="Emergency Summary" />
      <Card style={styles.card}>
        <LabelEyebrow>EMERGENCY TYPE</LabelEyebrow>
        <Text style={styles.value}>{selectedType || 'General Emergency'}</Text>

        <LabelEyebrow>DESCRIPTION</LabelEyebrow>
        <Text style={styles.desc}>{description || 'No description provided (Location only dispatch)'}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <LabelEyebrow>INCIDENT PICKUP LOCATION</LabelEyebrow>
          <Pill color={isGpsLocked ? 'success' : 'amber'}>
            {isGpsLocked ? '📍 GPS LOCKED' : '🛰️ ACQUIRING'}
          </Pill>
        </View>

        <Text style={styles.locName}>
          {locationAddress || (isGpsLocked ? 'Current Device Location' : 'Locating GPS fix...')}
        </Text>
        {lastKnownLocation ? (
          <Text style={styles.locCoords}>
            🌐 Hardware GPS: {lastKnownLocation.latitude.toFixed(4)}° N, {lastKnownLocation.longitude.toFixed(4)}° E
          </Text>
        ) : null}
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
  locName: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 4 },
  locCoords: { fontSize: 11, color: colors.inkFaint, marginTop: 2, fontWeight: '500' },
});

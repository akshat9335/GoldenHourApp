import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Banner, Icon } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';

export default function AiAmbulanceRec() {
  const aiSeverity = useAppStore((s) => s.aiSeverity);

  const isCriticalOrHigh = aiSeverity === 'critical' || aiSeverity === 'high';
  const ambType = isCriticalOrHigh ? 'ALS Rescue Ambulance' : 'BLS Response Ambulance';
  const ambDesc = isCriticalOrHigh
    ? 'Advanced Life Support: Ventilator, Defibrillator, Trauma Care Specialist aboard.'
    : 'Basic Life Support: Oxygen delivery, vitals monitoring, Paramedic stabilization.';

  return (
    <Screen>
      <TopBar title="Ambulance Recommendation" />
      <Banner color={isCriticalOrHigh ? 'red' : 'amber'} icon={<Icon name="ambulance" size={15} color={isCriticalOrHigh ? colors.redDark : colors.amber} />}>
        {isCriticalOrHigh
          ? 'Based on AI assessment, an Advanced Life Support (ALS) rescue unit is advised.'
          : 'Based on moderate severity, a Basic Life Support (BLS) rapid transport unit is advised.'}
      </Banner>
      <View style={{ height: 16 }} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{ambType}</Text>
          <Pill color={isCriticalOrHigh ? 'red' : 'amber'}>RECOMMENDED</Pill>
        </View>
        <Text style={styles.sub}>{ambDesc}</Text>
        <Text style={[styles.sub, { marginTop: 4, fontWeight: '600' }]}>Nearest unit: 2.1 km · ETA 6 min</Text>
      </Card>
      <Button title="Continue" onPress={() => router.push('/(patient)/emergency/ai-hospital-rec')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 6 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Divider, LabelEyebrow } from '@/components/ui';

export default function HospitalDetail() {
  const { name, distance, eta, beds, icuBeds, traumaLevel } = useLocalSearchParams<{
    name?: string;
    distance?: string;
    eta?: string;
    beds?: string;
    icuBeds?: string;
    traumaLevel?: string;
  }>();

  const title = name || 'Swaroop Rani Nehru Hospital (SRN)';
  const distText = distance ? `${distance} km · ${eta || 10} min` : '2.4 km · 8 min';

  return (
    <Screen>
      <TopBar title={title} />
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color="success">OPEN · ACCEPTING</Pill>
          <Text style={styles.dist}>{distText}</Text>
        </View>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <View style={styles.grid}>
          <Stat label="GENERAL BEDS" value={beds ? `${beds} available` : '18 available'} />
          <Stat label="ICU BEDS" value={icuBeds ? `${icuBeds} available` : '5 available'} color={colors.success} />
          <Stat label="TRAUMA LEVEL" value={traumaLevel ? `Level ${traumaLevel}` : 'Level 1 Trauma'} />
          <Stat label="ER CAPACITY" value="Open 24/7" color={colors.success} />
        </View>
      </Card>
      <Button
        title="Select This Hospital"
        onPress={() => router.push({ pathname: '/hospital-selected', params: { hospitalName: title } } as any)}
      />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ width: '48%' }}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dist: { fontSize: 11, color: colors.inkFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
});

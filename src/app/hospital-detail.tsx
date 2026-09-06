import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Divider, LabelEyebrow } from '@/components/ui';

export default function HospitalDetail() {
  return (
    <Screen>
      <TopBar title="St. Martha's Hospital" />
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color="success">OPEN · ACCEPTING</Pill>
          <Text style={styles.dist}>3.4 km · 11 min</Text>
        </View>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <View style={styles.grid}>
          <Stat label="GENERAL BEDS" value="14 / 20" />
          <Stat label="ICU BEDS" value="4 available" color={colors.success} />
          <Stat label="TRAUMA LEVEL" value="Level 1" />
          <Stat label="ER CAPACITY" value="Moderate" color={colors.amber} />
        </View>
      </Card>
      <Button title="Select This Hospital" onPress={() => router.push('/hospital-selected')} />
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

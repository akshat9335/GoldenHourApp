import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, LabelEyebrow, HospitalNav } from '@/components/ui';

export default function HospitalCapacity() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Hospital Capacity" back={false} />
        <LabelEyebrow>BED AVAILABILITY</LabelEyebrow>
        <Card style={styles.card}>
          <Row label="General Ward" value="14 / 20" />
          <Row label="ICU" value="4 available" color={colors.success} />
          <Row label="Trauma Bays" value="2 / 3 occupied" color={colors.amber} />
        </Card>
        <LabelEyebrow>TRAUMA CENTER INFO</LabelEyebrow>
        <Card style={{ padding: 14 }}>
          <Pill color="blue">Level 1 Trauma Center</Pill>
          <Text style={styles.desc}>24/7 cardiac, neuro and surgical capability on-site.</Text>
        </Card>
      </Screen>
      <HospitalNav active="/(hospital)/capacity" />
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 12.5, color: colors.ink },
  rowValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  desc: { fontSize: 11.5, color: colors.inkSoft, marginTop: 8 },
});

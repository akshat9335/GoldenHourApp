import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Divider, LabelEyebrow, Icon, HTitle } from '@/components/ui';

export default function GpsAccuracy() {
  return (
    <Screen>
      <TopBar title="GPS Accuracy" />
      <Card style={styles.hero}>
        <Icon name="gps" size={26} color={colors.blue} />
        <HTitle size={16}>Strong Signal</HTitle>
        <Text style={styles.heroSub}>Accurate to within 5 meters</Text>
      </Card>
      <LabelEyebrow>DETAILS</LabelEyebrow>
      <Card style={{ padding: 4 }}>
        <Row label="Latitude" value="12.9352° N" />
        <Divider />
        <Row label="Longitude" value="77.6146° E" />
        <Divider />
        <Row label="Satellites" value="14 connected" />
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, alignItems: 'center', gap: 6, marginBottom: 14 },
  heroSub: { fontSize: 11.5, color: colors.inkFaint },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  rowLabel: { fontSize: 12.5, color: colors.ink },
  rowValue: { fontSize: 12, fontWeight: '700', color: colors.ink },
});

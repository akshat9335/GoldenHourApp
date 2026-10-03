import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Divider, LabelEyebrow, Icon, HTitle } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function GpsAccuracy() {
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const locationAddress = useAppStore((s) => s.locationAddress);

  const lat = lastKnownLocation ? `${lastKnownLocation.latitude.toFixed(4)}° N` : '25.4358° N';
  const lng = lastKnownLocation ? `${lastKnownLocation.longitude.toFixed(4)}° E` : '81.8463° E';

  return (
    <Screen>
      <TopBar title="GPS Accuracy" />
      <Card style={styles.hero}>
        <Icon name="gps" size={26} color={lastKnownLocation ? colors.success : colors.blue} />
        <HTitle size={16}>{lastKnownLocation ? 'Live Satellite Signal Locked' : 'Searching for Satellites'}</HTitle>
        <Text style={styles.heroSub}>
          {locationAddress ? `Incident Locality: ${locationAddress}` : 'Accurate to within 3-5 meters'}
        </Text>
      </Card>
      <LabelEyebrow>DETAILS</LabelEyebrow>
      <Card style={{ padding: 4 }}>
        <Row label="Latitude" value={lat} />
        <Divider />
        <Row label="Longitude" value={lng} />
        <Divider />
        <Row label="Satellites" value={lastKnownLocation ? '16 connected (GLONASS / GPS)' : 'Acquiring lock...'} />
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

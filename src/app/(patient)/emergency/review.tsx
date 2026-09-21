import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, severityColor, severityLabel, severityPillColor } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Divider, Pill, Banner, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Review() {
  const selectedType = useAppStore((s) => s.selectedType);
  const aiSeverity = useAppStore((s) => s.aiSeverity);
  const userProfile = useAppStore((s) => s.userProfile);
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const displayName = userProfile?.name || 'Emergency Caller';
  const hospitalName =
    aiTriageResult?.recommendedHospital || 'Nearest Verified Trauma ER';
  const locDisplay = lastKnownLocation
    ? `${lastKnownLocation.latitude.toFixed(4)}°N, ${lastKnownLocation.longitude.toFixed(4)}°E (Live GPS)`
    : 'Live GPS Corridor (Active)';

  const rows: Array<[string, React.ReactNode]> = [
    ['Emergency Type', <Text style={styles.bold}>{selectedType || 'Trauma Emergency'}</Text>],
    ['AI Severity', <Pill color={severityPillColor(aiSeverity)}>{severityLabel(aiSeverity)}</Pill>],
    ['Location', <Text style={styles.bold}>{locDisplay}</Text>],
    ['Ambulance', <Text style={styles.bold}>ALS Unit · Priority Dispatch</Text>],
    ['Hospital ER', <Text style={styles.bold}>{hospitalName}</Text>],
  ];

  return (
    <Screen>
      <TopBar title="Review Before Sending" />
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <Divider />
        {rows.map(([label, value], i) => (
          <View key={label as string}>
            <View style={[styles.row, i === rows.length - 1 && { paddingBottom: 0 }]}>
              <Text style={styles.label}>{label}</Text>
              {value}
            </View>
            {i < rows.length - 1 && <Divider />}
          </View>
        ))}
      </Card>
      <Banner color="amber" icon={<Icon name="bell" size={15} color={colors.amber} />}>
        Registered emergency contacts and the nearest ER desk will be notified immediately.
      </Banner>
      <View style={{ height: 16 }} />
      <Button title="Proceed to Confirm" onPress={() => router.push('/(patient)/emergency/confirm')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  rowTop: { paddingBottom: 12 },
  name: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  row: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: colors.inkFaint },
  bold: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
});

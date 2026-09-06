import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, severityColor, severityLabel, severityPillColor } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Divider, Pill, Banner, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Review() {
  const selectedType = useAppStore((s) => s.selectedType);
  const aiSeverity = useAppStore((s) => s.aiSeverity);

  const rows: Array<[string, React.ReactNode]> = [
    ['Emergency Type', <Text style={styles.bold}>{selectedType}</Text>],
    ['AI Severity', <Pill color={severityPillColor(aiSeverity)}>{severityLabel(aiSeverity)}</Pill>],
    ['Location', <Text style={styles.bold}>Koramangala, Blr</Text>],
    ['Ambulance', <Text style={styles.bold}>ALS · 6 min ETA</Text>],
    ["Hospital", <Text style={styles.bold}>St. Martha's</Text>],
  ];

  return (
    <Screen>
      <TopBar title="Review Before Sending" />
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>Akshat Srivastava</Text>
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
        2 emergency contacts will be notified with your live location once confirmed.
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

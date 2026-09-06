import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Stepper, LabelEyebrow } from '@/components/ui';
import { AMB_STEPS } from '@/constants/data';

export default function HistoryDetail() {
  return (
    <Screen>
      <TopBar title="Accident — Sep 2, 2026" />
      <Card style={styles.card}>
        <Stepper steps={AMB_STEPS} currentIndex={AMB_STEPS.length} />
      </Card>
      <LabelEyebrow>AI ASSESSMENT</LabelEyebrow>
      <Card style={styles.assessCard}>
        <Pill color="orange">HIGH</Pill>
        <Text style={styles.assessText}>Suspected fracture, moderate blood loss.</Text>
      </Card>
      <LabelEyebrow>HOSPITAL & AMBULANCE</LabelEyebrow>
      <Card style={{ padding: 14 }}>
        <StatRow label="Hospital" value="St. Martha's" />
        <StatRow label="Ambulance" value="KA-05-AB" />
        <StatRow label="Total Time" value="21 min" />
      </Card>
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  assessCard: { padding: 14, marginBottom: 14, gap: 8 },
  assessText: { fontSize: 12, color: colors.inkSoft, marginTop: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  statLabel: { fontSize: 12, color: colors.inkFaint },
  statValue: { fontSize: 12, fontWeight: '700', color: colors.ink },
});

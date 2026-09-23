import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function AiHospitalRec() {
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const selectedType = useAppStore((s) => s.selectedType);

  const hospitalName =
    aiTriageResult?.recommendedHospital ||
    'Nearest Verified Trauma Center & ER';

  const specialty =
    aiTriageResult?.emergencyType || selectedType || 'Emergency Trauma Unit';

  return (
    <Screen>
      <TopBar title="Hospital Recommendation" />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{hospitalName}</Text>
          <Pill color="success">AI MATCH</Pill>
        </View>
        <Text style={styles.sub}>{specialty} · Emergency ER Ready</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pill color="blue">ICU Ready</Pill>
          <Pill color="grey">Priority ER Desk</Pill>
        </View>
      </Card>
      <Button title="Continue to Confirmation" onPress={() => router.push('/(patient)/emergency/review')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: colors.red },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginVertical: 8 },
});

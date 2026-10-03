import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Stepper, LabelEyebrow } from '@/components/ui';
import { AMB_STEPS } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function HistoryDetail() {
  const { emergencyId } = useLocalSearchParams<{ emergencyId?: string }>();
  const storeId = useAppStore((s) => s.emergencyId);
  const activeId = emergencyId || storeId;

  const [emergency, setEmergency] = useState<any>(null);

  useEffect(() => {
    if (activeId) {
      api.emergencies.getById(activeId).then((data) => {
        if (data) setEmergency(data);
      }).catch(() => {});
    }
  }, [activeId]);

  const incidentType = emergency?.incidentType || 'Emergency Trauma';
  const hospitalName = emergency?.assignedHospitalName || emergency?.alertedHospitalName || 'Swaroop Rani Nehru Hospital (SRN)';
  const ambulanceUnit = emergency?.assignedAmbulanceId || emergency?.assignedDriverName || 'Unit UP-70-AMB';
  const severity = (emergency?.severity || 'HIGH').toUpperCase();
  const triageDesc = emergency?.description || (emergency?.notes) || 'Emergency medical response dispatched with clinical telemetry.';

  return (
    <Screen>
      <TopBar title={`${incidentType} — Details`} />
      <Card style={styles.card}>
        <Stepper steps={AMB_STEPS} currentIndex={AMB_STEPS.length} />
      </Card>
      <LabelEyebrow>AI ASSESSMENT</LabelEyebrow>
      <Card style={styles.assessCard}>
        <Pill color={severity === 'CRITICAL' ? 'red' : 'orange'}>{severity}</Pill>
        <Text style={styles.assessText}>{triageDesc}</Text>
      </Card>
      <LabelEyebrow>HOSPITAL & AMBULANCE</LabelEyebrow>
      <Card style={{ padding: 14 }}>
        <StatRow label="Hospital" value={hospitalName} />
        <StatRow label="Ambulance" value={ambulanceUnit} />
        <StatRow label="Status" value={emergency?.status || 'COMPLETED'} />
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

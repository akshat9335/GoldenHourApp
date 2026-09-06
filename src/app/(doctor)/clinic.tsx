import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Divider, LabelEyebrow, DoctorNav } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function DoctorClinic() {
  const doctor = getDoctorById('doc-1');
  const [open, setOpen] = useState(true);
  const queueStatus = useAppStore((s) => s.queueStatus);
  const setQueueStatus = useAppStore((s) => s.setQueueStatus);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Clinic Management" back={false} />

        <Card style={styles.card}>
          <View style={styles.rowTop}>
            <LabelEyebrow>CLINIC STATUS</LabelEyebrow>
            <Pill color={open ? 'success' : 'red'}>{open ? 'OPEN' : 'CLOSED'}</Pill>
          </View>
          <Text style={styles.clinicName}>{doctor.clinic}</Text>
          <Text style={styles.sub}>{doctor.address}</Text>
          <View style={{ marginVertical: 12 }}><Divider /></View>
          <View style={styles.grid}>
            <Stat label="TODAY'S QUEUE" value={`${doctor.currentToken} / 40`} />
            <Stat label="CONSULTATION FEE" value={`₹${doctor.fee}`} />
            <Stat label="WORKING HOURS" value={doctor.workingHours} />
            <Stat label="TOKEN START" value="10:00 AM" />
          </View>
        </Card>

        <View style={styles.actions}>
          <Button title={open ? 'Close Clinic' : 'Open Clinic'} variant={open ? 'secondary' : 'primary'} style={{ flex: 1 }} onPress={() => setOpen(!open)} />
        </View>
        <View style={styles.actions}>
          {queueStatus !== 'running' ? (
            <Button title="Start Queue" style={{ flex: 1 }} onPress={() => setQueueStatus('running')} />
          ) : (
            <Button title="Pause Queue" variant="secondary" style={{ flex: 1 }} onPress={() => setQueueStatus('paused')} />
          )}
        </View>
      </Screen>
      <DoctorNav active="/(doctor)/clinic" />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%' }}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clinicName: { fontWeight: '700', fontSize: 15, color: colors.ink, marginTop: 10 },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statValue: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
});

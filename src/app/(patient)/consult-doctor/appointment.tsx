import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Divider, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function AppointmentDetail() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const userToken = useAppStore((s) => s.userToken);
  const doctor = getDoctorById(selectedDoctorId);
  const [cancelled, setCancelled] = useState(false);

  return (
    <Screen>
      <TopBar title="Appointment" />

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>{doctor.name}</Text>
          <Pill color={cancelled ? 'grey' : 'success'}>{cancelled ? 'CANCELLED' : 'UPCOMING'}</Pill>
        </View>
        <Text style={styles.sub}>{doctor.specialization}</Text>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <View style={styles.grid}>
          <Stat label="CLINIC" value={doctor.clinic} />
          <Stat label="DATE" value="Today" />
          <Stat label="TIME" value="4:30 PM" />
          <Stat label="TOKEN" value={String(userToken ?? doctor.currentToken)} />
          <Stat label="ESTIMATED WAIT" value={`~${doctor.estimatedWaitMin} min`} />
          <Stat label="STATUS" value={cancelled ? 'Cancelled' : 'Confirmed'} />
        </View>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <LabelEyebrow>CLINIC ADDRESS</LabelEyebrow>
        <Text style={styles.address}>{doctor.address}</Text>
      </Card>

      {!cancelled && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Get Directions" variant="blue" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/clinic-location')} />
            <Button title="View Queue" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/live-queue')} />
          </View>
          <Button title="Cancel Appointment" variant="ghost" onPress={() => setCancelled(true)} />
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%', marginBottom: 10 }}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '700', fontSize: 15, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
  address: { fontSize: 11.5, color: colors.ink, marginTop: 3, lineHeight: 17 },
});

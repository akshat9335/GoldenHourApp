import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Divider, LabelEyebrow, Icon, MapBg } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function ClinicDetails() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const doctor = getDoctorById(selectedDoctorId);
  const statusLabel = doctor.status === 'open' ? '🟢 Open' : doctor.status === 'busy' ? '🟡 Busy' : '🔴 Closed';
  const statusColor = doctor.status === 'open' ? 'success' : doctor.status === 'busy' ? 'amber' : 'grey';

  return (
    <Screen>
      <TopBar title={doctor.clinic} />

      <Pressable onPress={() => router.push('/(patient)/consult-doctor/clinic-location')}>
        <View style={styles.mapPreview}>
          <MapBg />
          <View style={styles.mapPin}><Icon name="pin" color={colors.red} /></View>
          <View style={styles.mapBadge}><Text style={styles.mapBadgeText}>Tap to view route</Text></View>
        </View>
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color={statusColor}>{statusLabel}</Pill>
          <Text style={styles.dist}>{doctor.distanceKm} km · ~{doctor.etaMin} min</Text>
        </View>
        <Text style={styles.address}>{doctor.address}</Text>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <View style={styles.grid}>
          <Stat label="TODAY'S TIMINGS" value={doctor.workingHours} />
          <Stat label="CONSULTATION FEE" value={`₹${doctor.fee}`} />
          <Stat label="DOCTOR" value={doctor.name} />
          <Stat label="ESTIMATED WAIT" value={`~${doctor.estimatedWaitMin} min`} />
        </View>
      </Card>

      <Card style={styles.card}>
        <LabelEyebrow>CURRENT QUEUE</LabelEyebrow>
        <View style={styles.grid}>
          <Stat label="CURRENT TOKEN" value={String(doctor.currentToken)} />
          <Stat label="PATIENTS WAITING" value={String(Math.max(doctor.currentToken - doctor.servingToken, 0))} />
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <Button title="Get Directions" variant="blue" onPress={() => router.push('/(patient)/consult-doctor/clinic-location')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Take Token" style={{ flex: 1 }} disabled={doctor.status === 'closed'} onPress={() => router.push('/(patient)/consult-doctor/live-queue')} />
          <Button title="Book Appointment" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/booking')} />
        </View>
      </View>
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
  mapPreview: { height: 140, borderRadius: 16, overflow: 'hidden', marginBottom: 14, position: 'relative' },
  mapPin: { position: 'absolute', top: '42%', left: '46%' },
  mapBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  mapBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.blue },
  card: { padding: 16, marginBottom: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dist: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  address: { fontSize: 11.5, color: colors.inkFaint, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
});

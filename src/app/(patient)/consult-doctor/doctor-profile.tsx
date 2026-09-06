import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Divider, LabelEyebrow, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function DoctorProfileScreen() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const setUserToken = useAppStore((s) => s.setUserToken);
  const doctor = getDoctorById(selectedDoctorId);

  function takeToken() {
    setUserToken(doctor.currentToken + 1);
    router.push('/(patient)/consult-doctor/live-queue');
  }

  return (
    <Screen>
      <TopBar title={doctor.name} />

      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={styles.avatar}><Icon name="doctor" size={30} color={colors.red} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Text style={styles.name}>{doctor.name}</Text>
          {doctor.verified && <Pill color="success">✓ VERIFIED</Pill>}
        </View>
        <Text style={styles.spec}>{doctor.specialization}</Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.grid}>
          <Stat label="QUALIFICATION" value={doctor.qualification} />
          <Stat label="EXPERIENCE" value={doctor.experience} />
          <Stat label="CONSULTATION FEE" value={`₹${doctor.fee}`} />
          <Stat label="AVAILABILITY" value={doctor.availableToday ? 'Available Today' : 'Not Available Today'} color={doctor.availableToday ? colors.success : colors.inkFaint} />
        </View>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <LabelEyebrow>CLINIC</LabelEyebrow>
        <Text style={styles.clinicName}>{doctor.clinic}</Text>
        <Text style={styles.address}>{doctor.address} · {doctor.distanceKm} km</Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color={doctor.status === 'open' ? 'success' : doctor.status === 'busy' ? 'amber' : 'grey'}>
            {doctor.status.toUpperCase()}
          </Pill>
          <Text style={styles.waitText}>~{doctor.estimatedWaitMin} min wait</Text>
        </View>
        <View style={styles.tokenGrid}>
          <Stat label="CURRENT TOKEN" value={String(doctor.currentToken)} />
          <Stat label="CURRENTLY SERVING" value={String(doctor.servingToken)} />
          <Stat label="PATIENTS WAITING" value={String(Math.max(doctor.currentToken - doctor.servingToken, 0))} />
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Take Token" style={{ flex: 1 }} disabled={doctor.status === 'closed'} onPress={takeToken} />
          <Button title="Book Appointment" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/booking')} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="View Clinic" variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/clinic-details')} />
          <Button title="Get Directions" variant="blue" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/clinic-location')} />
        </View>
      </View>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ width: '48%', marginBottom: 10 }}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '700', fontSize: 16, color: colors.ink },
  spec: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  card: { padding: 16, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
  clinicName: { fontWeight: '700', fontSize: 13.5, color: colors.ink, marginTop: 2 },
  address: { fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  waitText: { fontSize: 11, color: colors.inkFaint, fontWeight: '600' },
  tokenGrid: { flexDirection: 'row', flexWrap: 'wrap' },
});

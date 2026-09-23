import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Chip, Button, Divider, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

import { api } from '@/services/api';

const DATES = ['Today', 'Tomorrow', 'Day After'];
const SLOTS = ['10:30 AM', '11:00 AM', '2:00 PM', '4:30 PM', '6:00 PM'];

export default function Booking() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const selectedDoctor = useAppStore((s) => s.selectedDoctor);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserToken = useAppStore((s) => s.setUserToken);
  const doctor = selectedDoctor || getDoctorById(selectedDoctorId);
  const [date, setDate] = useState('Today');
  const [slot, setSlot] = useState(SLOTS[0]);
  const [loading, setLoading] = useState(false);

  const patientName = userProfile?.name || 'Patient';
  const patientId = userProfile?.uid || (userProfile as any)?.id || 'patient-1';

  async function confirm() {
    setLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const bookingDate =
      date === 'Today'
        ? todayStr
        : date === 'Tomorrow'
        ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
        : new Date(Date.now() + 172800000).toISOString().split('T')[0];

    try {
      const res: any = await api.appointments.book({
        doctorId: selectedDoctorId,
        date: bookingDate,
        timeSlot: slot,
        patientName,
        patientId,
      });
      const tokenNum = res?.tokenNumber || (doctor.servingToken || 0) + (doctor.queueLength || 0) + 1;
      setUserToken(tokenNum);
      useAppStore.getState().addBookedAppointment({
        appointmentId: res?.appointmentId || `appt-${Date.now()}`,
        doctorId: selectedDoctorId,
        doctorName: doctor.name,
        clinicName: doctor.clinic,
        date: bookingDate,
        timeSlot: slot,
        tokenNumber: tokenNum,
        status: 'CONFIRMED',
      });
    } catch (_err) {
      // Offline fallback
      const fallbackToken = (doctor.servingToken || 0) + (doctor.queueLength || 0) + 1;
      setUserToken(fallbackToken);
      useAppStore.getState().addBookedAppointment({
        appointmentId: `appt-offline-${Date.now()}`,
        doctorId: selectedDoctorId,
        doctorName: doctor.name,
        clinicName: doctor.clinic,
        date: bookingDate,
        timeSlot: slot,
        tokenNumber: fallbackToken,
        status: 'CONFIRMED',
      });
    } finally {
      setLoading(false);
      router.push('/(patient)/consult-doctor/booking-confirmed');
    }
  }

  return (
    <Screen>
      <TopBar title="Book Appointment" />

      <Card style={styles.card}>
        <LabelEyebrow>DOCTOR</LabelEyebrow>
        <Text style={styles.value}>{doctor.name} · {doctor.specialization}</Text>
        <View style={{ marginVertical: 10 }}><Divider /></View>
        <LabelEyebrow>CLINIC</LabelEyebrow>
        <Text style={styles.value}>{doctor.clinic}</Text>
        <Text style={styles.sub}>{doctor.address}</Text>
      </Card>

      <LabelEyebrow>SELECT DATE</LabelEyebrow>
      <View style={styles.chipsRow}>
        {DATES.map((d) => (
          <Chip key={d} label={d} selected={date === d} onPress={() => setDate(d)} />
        ))}
      </View>

      <LabelEyebrow>AVAILABLE TIME / TOKEN</LabelEyebrow>
      <View style={styles.chipsRow}>
        {SLOTS.map((s) => (
          <Chip key={s} label={s} selected={slot === s} onPress={() => setSlot(s)} />
        ))}
      </View>

      <Card style={styles.summaryCard}>
        <LabelEyebrow>ESTIMATED WAIT</LabelEyebrow>
        <Text style={styles.value}>~{doctor.estimatedWaitMin} min after your slot</Text>
      </Card>

      <Button title="Confirm Booking" onPress={confirm} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  value: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 3 },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryCard: { padding: 14, marginBottom: 18 },
});

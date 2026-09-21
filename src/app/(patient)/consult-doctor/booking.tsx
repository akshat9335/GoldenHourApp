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
  const setUserToken = useAppStore((s) => s.setUserToken);
  const doctor = getDoctorById(selectedDoctorId);
  const [date, setDate] = useState('Today');
  const [slot, setSlot] = useState(SLOTS[0]);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const res = await api.appointments.book({
        doctorId: selectedDoctorId,
        date: new Date().toISOString().split('T')[0],
        timeSlot: slot,
        patientName: 'Akshat Srivastava',
      });
      if (res && res.tokenNumber) {
        setUserToken(res.tokenNumber);
      } else {
        setUserToken(doctor.currentToken + 3);
      }
    } catch (_err) {
      // Offline fallback
      setUserToken(doctor.currentToken + 3);
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

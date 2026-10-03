import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
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
  const [liveDoctor, setLiveDoctor] = useState<any>(null);
  const [date, setDate] = useState('Today');
  const [slot, setSlot] = useState(SLOTS[0]);
  const [loading, setLoading] = useState(false);

  const patientName = userProfile?.name || 'Patient';
  const patientId = userProfile?.uid || (userProfile as any)?.id || 'patient-1';

  React.useEffect(() => {
    let mounted = true;
    api.doctors
      .search()
      .then((docs: any) => {
        const list = Array.isArray(docs) ? docs : docs?.data;
        if (mounted && Array.isArray(list)) {
          const found = list.find((d: any) => d.id === selectedDoctorId || d.doctorId === selectedDoctorId);
          if (found) setLiveDoctor(found);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [selectedDoctorId]);

  const isClosed =
    liveDoctor?.availability === 'OFFLINE' ||
    liveDoctor?.status === 'closed' ||
    (doctor as any)?.availability === 'OFFLINE' ||
    doctor?.status === 'closed';

  async function confirm() {
    if (date === 'Today' && isClosed) {
      Alert.alert(
        'OPD Closed Today',
        'Doctor OPD is currently CLOSED. Booking and tokens open only when the doctor opens the clinic. Please select Tomorrow to book.'
      );
      return;
    }

    setLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const bookingDate =
      date === 'Today'
        ? todayStr
        : date === 'Tomorrow'
        ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
        : new Date(Date.now() + 172800000).toISOString().split('T')[0];

    // Check client-side first
    const existingClientAppt = useAppStore.getState().bookedAppointments.find(
      (a) => a.doctorId === selectedDoctorId && a.date === bookingDate && a.status !== 'CANCELLED'
    );
    if (existingClientAppt) {
      setUserToken(existingClientAppt.tokenNumber);
      setLoading(false);
      Alert.alert(
        'Existing Appointment',
        `You already have Token #${existingClientAppt.tokenNumber} booked with ${doctor?.name || 'this doctor'} for ${date}. Redirecting to live queue.`
      );
      router.push('/(patient)/consult-doctor/live-queue');
      return;
    }

    try {
      const res: any = await api.appointments.book({
        doctorId: selectedDoctorId,
        date: bookingDate,
        timeSlot: slot,
        patientName,
        patientId,
      });

      if (res?.isExisting) {
        const tokenNum = res.tokenNumber;
        setUserToken(tokenNum);
        Alert.alert(
          'Existing Appointment',
          `You already have an active appointment (Token #${tokenNum}) with ${doctor?.name || 'this doctor'} on this date. Redirecting to live queue.`
        );
        router.push('/(patient)/consult-doctor/live-queue');
        return;
      }

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
      router.push('/(patient)/consult-doctor/booking-confirmed');
    } catch (_err: any) {
      // Clinic closed error strictly halts booking
      if (
        _err?.response?.data?.code === 'CLINIC_CLOSED' ||
        _err?.message?.includes('CLINIC_CLOSED') ||
        _err?.message?.includes('CLOSED')
      ) {
        Alert.alert(
          'OPD Clinic Closed',
          _err?.response?.data?.message || 'Doctor OPD is currently CLOSED. Booking and tokens open only when the doctor opens the clinic.'
        );
        return;
      }

      // If error indicates already booked, don't generate duplicate offline token
      if (_err?.response?.status === 409 || _err?.message?.includes('409') || _err?.message?.includes('already')) {
        Alert.alert('Notice', _err?.response?.data?.message || 'An appointment is already booked for this date.');
        router.push('/(patient)/consult-doctor/live-queue');
        return;
      }

      // Offline fallback only for genuine network issues
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
      router.push('/(patient)/consult-doctor/booking-confirmed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Book Appointment" />

      {date === 'Today' && isClosed && (
        <Card style={styles.closedCard}>
          <Text style={styles.closedTitle}>⚠️ Doctor OPD is Currently Closed</Text>
          <Text style={styles.closedSub}>
            Doctor has not opened the clinic yet or has concluded today's OPD. New tokens for today cannot be booked. Please select 'Tomorrow' to book in advance.
          </Text>
        </Card>
      )}

      <Card style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <LabelEyebrow>DOCTOR</LabelEyebrow>
            <Text style={styles.value}>{doctor.name} · {doctor.specialization}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isClosed ? '#FEE2E2' : '#DCFCE7' }]}>
            <Text style={[styles.statusBadgeText, { color: isClosed ? colors.red : colors.success }]}>
              {isClosed ? 'OPD CLOSED' : 'OPD OPEN'}
            </Text>
          </View>
        </View>
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
        <Text style={styles.value}>~{doctor.estimatedWaitMin || 15} min after your slot</Text>
      </Card>

      <Button
        title={date === 'Today' && isClosed ? 'OPD Closed Today (Select Tomorrow)' : (loading ? 'Booking...' : 'Confirm Booking')}
        disabled={loading || (date === 'Today' && isClosed)}
        onPress={confirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  value: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 3 },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryCard: { padding: 14, marginBottom: 18 },
  closedCard: {
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  closedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.red,
  },
  closedSub: {
    fontSize: 11.5,
    color: '#991B1B',
    marginTop: 4,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

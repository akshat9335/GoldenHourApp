import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Divider, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

import { api } from '@/services/api';

export default function AppointmentDetail() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const selectedDoctor = useAppStore((s) => s.selectedDoctor);
  const userToken = useAppStore((s) => s.userToken);
  const doctor = selectedDoctor || getDoctorById(selectedDoctorId);
  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    api.appointments
      .getMyAppointments()
      .then((res: any) => {
        const appts = Array.isArray(res) ? res : res?.data;
        if (mounted && Array.isArray(appts) && appts.length > 0) {
          const matched =
            appts.find((a: any) => a.doctorId === selectedDoctorId && a.status !== 'CANCELLED') ||
            appts[0];
          if (matched) {
            setActiveAppt(matched);
            if (matched.status === 'CANCELLED') {
              setCancelled(true);
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [selectedDoctorId]);

  const handleCancel = async () => {
    if (activeAppt?.appointmentId) {
      setCancelling(true);
      try {
        await api.appointments.cancel(activeAppt.appointmentId);
      } catch {}
      setCancelling(false);
    }
    setCancelled(true);
  };

  const displayDate = activeAppt?.date || 'Today';
  const displayTime = activeAppt?.timeSlot || '10:30 AM';
  const displayToken = String(activeAppt?.tokenNumber ?? userToken ?? (doctor.servingToken || 0) + 1);
  const displayStatus = cancelled ? 'Cancelled' : (activeAppt?.status || 'Confirmed');

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
          <Stat label="DATE" value={displayDate} />
          <Stat label="TIME" value={displayTime} />
          <Stat label="TOKEN" value={displayToken} />
          <Stat label="ESTIMATED WAIT" value={`~${doctor.estimatedWaitMin || 15} min`} />
          <Stat label="STATUS" value={displayStatus} />
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
          <Button
            title={cancelling ? 'Cancelling...' : 'Cancel Appointment'}
            variant="ghost"
            disabled={cancelling}
            onPress={handleCancel}
          />
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

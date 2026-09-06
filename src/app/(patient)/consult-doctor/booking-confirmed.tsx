import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon, Card, LabelEyebrow, Divider } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function BookingConfirmed() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const userToken = useAppStore((s) => s.userToken);
  const doctor = getDoctorById(selectedDoctorId);
  const appointmentId = `GH-DOC-${String(userToken ?? doctor.currentToken).padStart(4, '0')}`;

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Appointment Confirmed"
        desc={`Your appointment with ${doctor.name} has been booked successfully.`}
      />

      <Card style={styles.card}>
        <Row label="Appointment ID" value={appointmentId} />
        <Divider />
        <Row label="Token Number" value={String(userToken ?? doctor.currentToken)} />
        <Divider />
        <Row label="Doctor" value={doctor.name} />
        <Divider />
        <Row label="Clinic" value={doctor.clinic} />
      </Card>

      <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
        <Button title="View Appointment" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/appointment')} />
        <Button title="Get Directions" variant="blue" style={{ flex: 1 }} onPress={() => router.push('/(patient)/consult-doctor/clinic-location')} />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, width: '100%', marginVertical: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
});

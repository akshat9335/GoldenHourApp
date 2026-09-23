import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Stepper, Icon } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

const STEPS = ['Emergency accepted', 'Team & bay assigned', 'Awaiting patient arrival'];

export default function HospitalReady() {
  const activeHospitalRequestId = useAppStore((s) => s.activeHospitalRequestId);
  const emergencyId = useAppStore((s) => s.emergencyId);

  const handlePatientArrived = async () => {
    const id = activeHospitalRequestId || emergencyId || 'req-demo-1';
    try {
      await api.hospitals.markPatientArrived(id);
      await api.hospitals.completeRequest(id);
    } catch (_err) {
      // Handled in demo mode
    }
    router.push('/(hospital)/completed');
  };

  return (
    <Screen>
      <TopBar title="Hospital Ready" />
      <Card style={styles.card}>
        <Icon name="check" color={colors.success} />
        <Text style={styles.cardText}>Trauma Bay 2 Prepared</Text>
      </Card>
      <Stepper steps={STEPS} currentIndex={2} />
      <Button title="Mark Patient Arrived" onPress={handlePatientArrived} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14, backgroundColor: colors.successBg, borderWidth: 0, alignItems: 'center', gap: 8 },
  cardText: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
});

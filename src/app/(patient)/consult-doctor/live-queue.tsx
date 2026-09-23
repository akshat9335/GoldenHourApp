import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, LabelEyebrow, Stepper } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';
import { api } from '@/services/api';

export default function LiveQueue() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const userToken = useAppStore((s) => s.userToken);
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);
  const doctor = getDoctorById(selectedDoctorId);

  const myToken = userToken ?? doctor.currentToken + 1;
  const patientsAhead = Math.max(myToken - servingToken - 1, 0);
  const isMyTurn = servingToken >= myToken;

  useEffect(() => {
    let mounted = true;
    api.queues
      .getLiveQueue(selectedDoctorId, myToken)
      .then((data: any) => {
        if (mounted && data && typeof data.servingToken === 'number') {
          useAppStore.setState({ servingToken: data.servingToken });
        }
      })
      .catch(() => {
        // Retain local state
      });
    return () => {
      mounted = false;
    };
  }, [selectedDoctorId, myToken]);

  const handleAdvance = async () => {
    try {
      const res: any = await api.queues.advanceQueue(selectedDoctorId);
      if (res && typeof res.servingToken === 'number') {
        useAppStore.setState({ servingToken: res.servingToken });
      } else {
        advanceServingToken();
      }
    } catch (_e) {
      advanceServingToken();
    }
  };

  const steps = [
    `Token ${servingToken - 1} → Completed`,
    `Token ${servingToken} → Serving`,
    ...Array.from({ length: Math.max(myToken - servingToken - 1, 0) }, (_, i) => `Token ${servingToken + i + 1} → Waiting`),
    `Token ${myToken} → Your Token`,
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Live Queue" />

        <Card style={styles.tokenCard}>
          {isMyTurn ? (
            <Pill color="success">YOUR TURN — PLEASE PROCEED</Pill>
          ) : (
            <Pill color="blue">WAITING</Pill>
          )}
          <View style={styles.tokenRow}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <LabelEyebrow>YOUR TOKEN</LabelEyebrow>
              <Text style={styles.tokenBig}>{myToken}</Text>
            </View>
            <View style={styles.divider} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <LabelEyebrow>CURRENTLY SERVING</LabelEyebrow>
              <Text style={styles.tokenBig}>{servingToken}</Text>
            </View>
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.metaText}>{patientsAhead} patients ahead</Text>
            <Text style={styles.metaText}>~{Math.max(patientsAhead * 8, 0)} min wait</Text>
          </View>
        </Card>

        <LabelEyebrow>QUEUE PROGRESS</LabelEyebrow>
        <Card style={{ padding: 18 }}>
          <Stepper steps={steps} currentIndex={Math.max(steps.length - 2, 0)} />
        </Card>

        {isMyTurn ? (
          <Button title="Consultation Completed" style={{ marginTop: 16 }} onPress={() => router.replace('/(patient)/consult-doctor' as any)} />
        ) : (
          <Button
            title="Simulate Queue Moving (Demo)"
            variant="secondary"
            style={{ marginTop: 16 }}
            onPress={handleAdvance}
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  tokenCard: { padding: 16, marginBottom: 16, alignItems: 'center' },
  tokenRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 12 },
  divider: { width: 1, height: 44, backgroundColor: colors.line },
  tokenBig: { fontSize: 30, fontWeight: '800', color: colors.red, marginTop: 4 },
  rowMeta: { flexDirection: 'row', gap: 16, marginTop: 12 },
  metaText: { fontSize: 11.5, color: colors.inkFaint, fontWeight: '600' },
});

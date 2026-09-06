import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, LabelEyebrow, Divider, DoctorNav } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

const statusColor: Record<string, 'success' | 'amber' | 'grey'> = {
  running: 'success',
  paused: 'amber',
  not_started: 'grey',
  closed: 'grey',
};

export default function DoctorQueue() {
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);
  const queueStatus = useAppStore((s) => s.queueStatus);
  const setQueueStatus = useAppStore((s) => s.setQueueStatus);

  const waiting = [servingToken + 1, servingToken + 2, servingToken + 3, servingToken + 4];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.headerRow}>
          <TopBar title="Queue Management" back={false} />
          <Pill color={statusColor[queueStatus]}>{queueStatus.replace('_', ' ').toUpperCase()}</Pill>
        </View>

        <Card style={styles.currentCard}>
          <LabelEyebrow>CURRENT PATIENT</LabelEyebrow>
          <Text style={styles.tokenBig}>Token #{servingToken}</Text>
          <Text style={styles.patientName}>Patient Name — Walk-in</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button title="Start Consultation" style={{ flex: 1 }} />
            <Button title="Skip" variant="secondary" style={{ flex: 1 }} onPress={advanceServingToken} />
          </View>
          <Button title="Complete Consultation" variant="blue" style={{ marginTop: 8 }} onPress={advanceServingToken} />
        </Card>

        <View style={styles.controlsRow}>
          {queueStatus !== 'running' ? (
            <Button title={queueStatus === 'not_started' ? 'Start Queue' : 'Resume Queue'} style={{ flex: 1 }} onPress={() => setQueueStatus('running')} />
          ) : (
            <Button title="Pause Queue" variant="secondary" style={{ flex: 1 }} onPress={() => setQueueStatus('paused')} />
          )}
        </View>

        <LabelEyebrow>WAITING PATIENTS</LabelEyebrow>
        <Card style={{ padding: 4 }}>
          {waiting.map((t, i) => (
            <React.Fragment key={t}>
              <View style={styles.row}>
                <Text style={styles.rowToken}>Token #{t}</Text>
                <Pill color={i === 0 ? 'amber' : 'grey'}>{i === 0 ? 'NEXT' : 'WAITING'}</Pill>
              </View>
              {i < waiting.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>
      </Screen>
      <DoctorNav active="/(doctor)/queue" />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentCard: { padding: 16, marginTop: 4, marginBottom: 14, alignItems: 'center' },
  tokenBig: { fontSize: 30, fontWeight: '800', color: colors.red, marginTop: 4 },
  patientName: { fontSize: 12, color: colors.inkFaint, marginTop: 4 },
  controlsRow: { marginBottom: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  rowToken: { fontWeight: '700', fontSize: 13, color: colors.ink },
});

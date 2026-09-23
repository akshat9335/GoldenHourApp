import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, LabelEyebrow, Divider, DoctorNav } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

import { api } from '@/services/api';

const statusColor: Record<string, 'success' | 'amber' | 'grey'> = {
  running: 'success',
  paused: 'amber',
  not_started: 'grey',
  closed: 'grey',
};

export default function DoctorQueue() {
  const userProfile = useAppStore((s) => s.userProfile);
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);
  const queueStatus = useAppStore((s) => s.queueStatus);
  const setQueueStatus = useAppStore((s) => s.setQueueStatus);

  const doctorId = userProfile?.uid ? `doc-${userProfile.uid}` : 'doc-1';
  const [appointments, setAppointments] = React.useState<any[]>([]);

  const fetchQueueData = () => {
    api.queues
      .getLiveQueue(doctorId)
      .then((q: any) => {
        if (q && typeof q.servingToken === 'number') {
          useAppStore.setState({ servingToken: q.servingToken });
        }
      })
      .catch(() => {});

    api.appointments
      .getDoctorAppointments({ doctorId })
      .then((data: any) => {
        if (Array.isArray(data)) {
          setAppointments(data);
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    fetchQueueData();
  }, [doctorId]);

  const currentAppt = appointments.find(
    (a) => (a.tokenNumber || a.token) === servingToken
  );
  const currentPatientName =
    currentAppt?.patientName ||
    (servingToken > 0 ? `Walk-in Patient (Token #${servingToken})` : 'No Active Patient');
  const currentStatus =
    (currentAppt?.status || (servingToken > 0 ? 'WAITING' : 'IDLE')).toUpperCase();

  const handleNext = async () => {
    try {
      const res: any = await api.queues.advanceQueue(doctorId);
      if (res && typeof res.servingToken === 'number') {
        useAppStore.setState({ servingToken: res.servingToken });
      } else {
        advanceServingToken();
      }
    } catch (_err) {
      advanceServingToken();
    }
    fetchQueueData();
  };

  const handleStart = async () => {
    if (currentAppt?.appointmentId) {
      try {
        await api.appointments.start(currentAppt.appointmentId);
      } catch {}
    }
    setAppointments((prev) =>
      prev.map((a) =>
        (a.appointmentId || a.id) === (currentAppt?.appointmentId || currentAppt?.id)
          ? { ...a, status: 'IN_PROGRESS' }
          : a
      )
    );
  };

  const handleComplete = async () => {
    if (currentAppt?.appointmentId) {
      try {
        await api.appointments.complete(currentAppt.appointmentId);
      } catch {}
    }
    await handleNext();
  };

  const handleSkip = async () => {
    if (currentAppt?.appointmentId) {
      try {
        await api.appointments.skip(currentAppt.appointmentId);
      } catch {}
    }
    await handleNext();
  };

  const waitingAppointments = appointments.filter(
    (a) => (a.tokenNumber || a.token) > servingToken && (a.status || '').toUpperCase() !== 'CANCELLED'
  );

  const fallbackWaitingTokens = [servingToken + 1, servingToken + 2, servingToken + 3];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.headerRow}>
          <TopBar title="Queue Management" back={false} />
          <Pill color={statusColor[queueStatus]}>{queueStatus.replace('_', ' ').toUpperCase()}</Pill>
        </View>

        <Card style={styles.currentCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 8 }}>
            <LabelEyebrow>CURRENT CONSULTATION</LabelEyebrow>
            <Pill color={currentStatus === 'IN_PROGRESS' ? 'success' : currentStatus === 'COMPLETED' ? 'blue' : 'amber'}>
              {currentStatus}
            </Pill>
          </View>
          <Text style={styles.tokenBig}>Token #{servingToken}</Text>
          <Text style={styles.patientName}>{currentPatientName}</Text>
          {currentAppt?.timeSlot && (
            <Text style={styles.slotText}>Slot: {currentAppt.timeSlot} · {currentAppt.notes || 'General OPD'}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button
              title={currentStatus === 'IN_PROGRESS' ? "In Consultation…" : "Start Consultation"}
              disabled={currentStatus === 'IN_PROGRESS'}
              style={{ flex: 1 }}
              onPress={handleStart}
            />
            <Button title="Skip / No-Show" variant="secondary" style={{ flex: 1 }} onPress={handleSkip} />
          </View>
          <Button
            title="Complete Consultation & Call Next"
            variant="blue"
            style={{ marginTop: 8 }}
            onPress={handleComplete}
          />
        </Card>

        <View style={styles.controlsRow}>
          {queueStatus !== 'running' ? (
            <Button title={queueStatus === 'not_started' ? 'Start Queue' : 'Resume Queue'} style={{ flex: 1 }} onPress={() => setQueueStatus('running')} />
          ) : (
            <Button title="Pause Queue" variant="secondary" style={{ flex: 1 }} onPress={() => setQueueStatus('paused')} />
          )}
        </View>

        <LabelEyebrow>WAITING PATIENTS ({waitingAppointments.length})</LabelEyebrow>
        <Card style={{ padding: 4 }}>
          {waitingAppointments.length > 0 ? (
            waitingAppointments.map((a, i) => {
              const tok = a.tokenNumber || a.token;
              return (
                <React.Fragment key={a.appointmentId || a.id || `tok-${tok}`}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowToken}>Token #{tok} · {a.patientName}</Text>
                      <Text style={styles.rowSub}>{a.timeSlot || 'Scheduled'} {a.notes ? `· ${a.notes}` : ''}</Text>
                    </View>
                    <Pill color={i === 0 ? 'amber' : 'grey'}>{i === 0 ? 'NEXT' : 'WAITING'}</Pill>
                  </View>
                  {i < waitingAppointments.length - 1 && <Divider />}
                </React.Fragment>
              );
            })
          ) : (
            fallbackWaitingTokens.map((t, i) => (
              <React.Fragment key={t}>
                <View style={styles.row}>
                  <Text style={styles.rowToken}>Token #{t} (Upcoming)</Text>
                  <Pill color={i === 0 ? 'amber' : 'grey'}>{i === 0 ? 'NEXT' : 'WAITING'}</Pill>
                </View>
                {i < fallbackWaitingTokens.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
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
  patientName: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  slotText: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  controlsRow: { marginBottom: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  rowToken: { fontWeight: '700', fontSize: 13, color: colors.ink },
  rowSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
});

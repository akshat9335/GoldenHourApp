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
  const selectedDoctor = useAppStore((s) => s.selectedDoctor);
  const userToken = useAppStore((s) => s.userToken);
  const setUserToken = useAppStore((s) => s.setUserToken);
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);
  const doctor = selectedDoctor || getDoctorById(selectedDoctorId);

  const [isConsultCompleted, setIsConsultCompleted] = React.useState(false);
  const [currentAppt, setCurrentAppt] = React.useState<any>(null);
  const apptToken = currentAppt?.tokenNumber || currentAppt?.token;
  const myToken = apptToken ?? userToken ?? (doctor.servingToken || 0) + (doctor.queueLength || 0) + 1;
  const isCompleted =
    isConsultCompleted ||
    (currentAppt ? (currentAppt.status || '').toUpperCase() === 'COMPLETED' : false);
  const isDoctorReady =
    currentAppt &&
    ((currentAppt.status || '').toUpperCase() === 'IN_PROGRESS' ||
      (currentAppt.status || '').toUpperCase() === 'CALLED');
  const isMyTurn = !isCompleted && servingToken === myToken && servingToken > 0;
  const patientsAhead = Math.max(myToken - servingToken, 0);

  useEffect(() => {
    let mounted = true;

    const fetchQueue = () => {
      api.queues
        .getLiveQueue(selectedDoctorId, myToken)
        .then((data: any) => {
          if (mounted && data && typeof data.servingToken === 'number') {
            useAppStore.setState({ servingToken: data.servingToken });
          }
        })
        .catch(() => {});

      const pid = useAppStore.getState().userProfile?.uid || 'patient-1';
      api.appointments
        .getMyAppointments(pid)
        .then((res: any) => {
          const appts = Array.isArray(res) ? res : res?.data;
          if (mounted && Array.isArray(appts)) {
            const matchesDoc = (a: any) =>
              a.doctorId === selectedDoctorId ||
              a.doctorId === selectedDoctorId.replace(/^doc-/, '') ||
              `doc-${a.doctorId}` === selectedDoctorId;

            const docAppts = appts.filter(
              (a: any) => matchesDoc(a) && (a.status || '').toUpperCase() !== 'CANCELLED'
            );

            // 1. Prefer active appointment (IN_PROGRESS, CALLED, WAITING, CONFIRMED)
            const activeMatch =
              docAppts.find(
                (a: any) =>
                  (a.status || '').toUpperCase() !== 'COMPLETED' &&
                  (userToken ? (a.tokenNumber || a.token) === userToken : true)
              ) || docAppts.find((a: any) => (a.status || '').toUpperCase() !== 'COMPLETED');

            // 2. Fall back to completed only if no active exists
            const completedMatch =
              docAppts.find(
                (a: any) =>
                  (a.status || '').toUpperCase() === 'COMPLETED' &&
                  (userToken ? (a.tokenNumber || a.token) === userToken : true)
              ) || docAppts.find((a: any) => (a.status || '').toUpperCase() === 'COMPLETED');

            const chosen = activeMatch || completedMatch;
            if (chosen) {
              setCurrentAppt(chosen);
              const tok = chosen.tokenNumber || chosen.token;
              if (tok && tok !== userToken) {
                setUserToken(tok);
              }
              setIsConsultCompleted((chosen.status || '').toUpperCase() === 'COMPLETED');
            }
          }
        })
        .catch(() => {});
    };

    fetchQueue();
    const timer = setInterval(fetchQueue, 3000);

    return () => {
      mounted = false;
      clearInterval(timer);
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

  const handleFinish = () => {
    setUserToken(null);
    setCurrentAppt(null);
    setIsConsultCompleted(false);
    router.replace('/(patient)/consult-doctor' as any);
  };

  const steps = [
    `Token ${Math.max(servingToken - 1, 0)} → Completed`,
    `Token ${servingToken} → Serving`,
    ...Array.from({ length: Math.max(myToken - servingToken - 1, 0) }, (_, i) => `Token ${servingToken + i + 1} → Waiting`),
    `Token ${myToken} → Your Token`,
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Live Queue" />

        <Card style={styles.tokenCard}>
          {isCompleted ? (
            <Pill color="success">CONSULTATION COMPLETED</Pill>
          ) : isMyTurn ? (
            <Pill color="success">YOUR TURN — PLEASE PROCEED</Pill>
          ) : (
            <Pill color="blue">WAITING IN QUEUE</Pill>
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
            {isCompleted ? (
              <Text style={[styles.metaText, { color: colors.success }]}>Your consultation has finished</Text>
            ) : (
              <>
                <Text style={styles.metaText}>{patientsAhead} patients ahead</Text>
                <Text style={styles.metaText}>~{Math.max(patientsAhead * 8, 0)} min wait</Text>
              </>
            )}
          </View>
        </Card>

        <LabelEyebrow>QUEUE PROGRESS</LabelEyebrow>
        <Card style={{ padding: 18 }}>
          <Stepper steps={steps} currentIndex={Math.max(steps.length - 2, 0)} />
        </Card>

        {isCompleted ? (
          <View style={{ gap: 10, marginTop: 14 }}>
            <Card style={styles.completedNotice}>
              <Text style={styles.completedNoticeTitle}>✓ Consultation Completed</Text>
              <Text style={styles.completedNoticeSub}>
                Your session has concluded. Your digital prescription and clinical summary have been securely saved.
              </Text>
            </Card>
            <Button
              title="📄 View Prescription & Health Record"
              variant="blue"
              onPress={() => router.push('/(patient)/health-records' as any)}
            />
            <Button
              title="✓ Return to Doctor OPD / Book Follow-up"
              variant="primary"
              style={{ backgroundColor: colors.success }}
              onPress={handleFinish}
            />
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            {patientsAhead > 0 ? (
              <View style={styles.waitingNotice}>
                <Text style={styles.waitingNoticeTitle}>⏳ Waiting in Queue</Text>
                <Text style={styles.waitingNoticeSub}>
                  Doctor is currently attending Token #{servingToken}. Your token is #{myToken}.
                </Text>
                <Button
                  title={`Waiting for Your Turn (${patientsAhead} patient${patientsAhead > 1 ? 's' : ''} ahead)`}
                  disabled={true}
                  variant="secondary"
                  style={{ marginTop: 12, opacity: 0.6 }}
                />
              </View>
            ) : !isDoctorReady ? (
              <View style={[styles.waitingNotice, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Text style={[styles.waitingNoticeTitle, { color: '#92400e' }]}>🔔 It's Your Turn! (Token #{myToken})</Text>
                <Text style={[styles.waitingNoticeSub, { color: '#b45309' }]}>
                  Doctor has called your token. Please wait a moment while the doctor connects to the consultation room...
                </Text>
                <Button
                  title="⏳ Waiting for Doctor to Connect…"
                  disabled={true}
                  variant="secondary"
                  style={{ marginTop: 12, opacity: 0.8 }}
                />
              </View>
            ) : (
              <View style={[styles.waitingNotice, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <Text style={[styles.waitingNoticeTitle, { color: '#065f46' }]}>🟢 Doctor is in the Room & Waiting!</Text>
                <Text style={[styles.waitingNoticeSub, { color: '#047857' }]}>
                  Dr. {doctor.name} is ready for you. Tap below to connect to the teleconsultation room.
                </Text>
                <Button
                  title="📹 Join Teleconsultation Room Now ›"
                  style={{ marginTop: 12, backgroundColor: colors.blue }}
                  onPress={() => {
                    const consultId = currentAppt?.appointmentId || currentAppt?.id || `appt_${selectedDoctorId}_${myToken}`;
                    router.push(`/(patient)/teleconsultation/${consultId}` as any);
                  }}
                />
              </View>
            )}

            <Button
              title="Done / Return to OPD"
              variant="ghost"
              style={{ marginTop: 10 }}
              onPress={handleFinish}
            />
          </View>
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
  completedNotice: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', padding: 16 },
  completedNoticeTitle: { color: '#065f46', fontWeight: '800', fontSize: 15 },
  completedNoticeSub: { color: '#047857', fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  waitingNotice: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  waitingNoticeTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  waitingNoticeSub: { fontSize: 12, color: colors.inkSoft, marginTop: 4, lineHeight: 17 },
  noticeBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  noticeTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  noticeSub: { fontSize: 12, color: colors.inkSoft, marginTop: 4, lineHeight: 17 },
});

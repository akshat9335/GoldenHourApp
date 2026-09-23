import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, DoctorNav, HTitle, LabelEyebrow, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById, APPOINTMENTS } from '@/constants/doctorData';
import { api } from '@/services/api';

export default function DoctorDashboard() {
  const userProfile = useAppStore((s) => s.userProfile);
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);

  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  const doctorName = doctorDetails?.name || userProfile?.doctorName || userProfile?.name || 'Dr. Medical Practitioner';
  const doctorId = doctorDetails?.doctorId || (userProfile?.uid ? `doc-${userProfile.uid}` : 'doc-1');

  const defaultDoctor = getDoctorById('doc-1');
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadDoctorData = (resolvedId: string) => {
      // Fetch live queue
      api.queues
        .getLiveQueue(resolvedId)
        .then((qRes: any) => {
          const q = (qRes && typeof qRes === 'object' && 'servingToken' in qRes) ? qRes : (qRes?.data || qRes);
          if (mounted && q && typeof q.servingToken === 'number') {
            useAppStore.setState({ servingToken: q.servingToken });
          }
        })
        .catch(() => {});

      // Fetch real appointments
      api.appointments
        .getDoctorAppointments({ doctorId: resolvedId })
        .then((apptData: any) => {
          if (mounted && Array.isArray(apptData)) {
            const mapped = apptData.map((a: any) => ({
              id: a.appointmentId || a.id,
              doctorId: a.doctorId,
              patientName: a.patientName || 'Patient',
              date: a.date === new Date().toISOString().split('T')[0] ? 'Today' : a.date,
              time: a.timeSlot || '10:00 AM',
              token: a.tokenNumber || 1,
              status: (a.status?.toLowerCase() === 'completed' ? 'completed' : a.status?.toLowerCase() === 'cancelled' ? 'cancelled' : 'upcoming') as 'upcoming' | 'completed' | 'cancelled',
            }));
            setAppointments(mapped);
          }
        })
        .catch(() => {});
    };

    // Load authenticated doctor profile from backend
    api.doctors
      .getMyProfile()
      .then((res: any) => {
        const doc = (res && typeof res === 'object' && ('doctorId' in res || 'name' in res)) ? res : (res?.data || res);
        if (mounted && doc && (doc.doctorId || doc.name)) {
          setDoctorDetails(doc);
          const resolvedId = doc.doctorId || (userProfile?.uid ? `doc-${userProfile.uid}` : 'doc-1');
          loadDoctorData(resolvedId);
        } else {
          loadDoctorData(doctorId);
        }
      })
      .catch(() => {
        loadDoctorData(doctorId);
      });

    return () => {
      mounted = false;
    };
  }, [userProfile?.uid, doctorId]);

  const handleCallNext = async () => {
    try {
      const res: any = await api.queues.advanceQueue(doctorId);
      if (res && typeof res.servingToken === 'number') {
        useAppStore.setState({ servingToken: res.servingToken });
      } else {
        advanceServingToken();
      }
    } catch {
      advanceServingToken();
    }
  };

  const handleResetQueue = async () => {
    try {
      await api.queues.resetQueue(doctorId);
      useAppStore.setState({ servingToken: 0 });
    } catch {
      useAppStore.setState({ servingToken: 0 });
    }
  };

  const todaysAppointments = appointments;
  const completedToday = todaysAppointments.filter((a) => a.status === 'completed' || (servingToken > 0 && a.token <= servingToken)).length;
  const waitingToday = todaysAppointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed' && (servingToken === 0 || a.token > servingToken)).length;
  const totalToday = Math.max(todaysAppointments.length, servingToken);
  const remainingToday = Math.max(totalToday - completedToday, 0);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <HTitle size={17}>{doctorName}</HTitle>
          </View>
          <Pressable style={styles.bellBtn} onPress={() => router.push('/(doctor)/notifications')}>
            <Icon name="bell" />
          </Pressable>
        </View>

        <LabelEyebrow>TODAY'S SUMMARY</LabelEyebrow>
        <View style={styles.statsGrid}>
          <Card style={styles.stat}><Text style={styles.statNum}>{totalToday}</Text><Text style={styles.statLabel}>PATIENTS TODAY</Text></Card>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.success }]}>{completedToday}</Text><Text style={styles.statLabel}>COMPLETED</Text></Card>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.amber }]}>{waitingToday}</Text><Text style={styles.statLabel}>WAITING</Text></Card>
          <Card style={styles.stat}><Text style={styles.statNum}>{remainingToday}</Text><Text style={styles.statLabel}>REMAINING</Text></Card>
        </View>

        <Card style={styles.tokenCard}>
          <View style={styles.tokenRow}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <LabelEyebrow>NOW SERVING</LabelEyebrow>
              <Text style={styles.tokenNum}>{servingToken}</Text>
              <Text style={styles.tokenSub}>Patient #{servingToken}</Text>
            </View>
            <View style={styles.tokenDivider} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <LabelEyebrow>NEXT PATIENT</LabelEyebrow>
              <Text style={styles.tokenNum}>{servingToken + 1}</Text>
              <Text style={styles.tokenSub}>Token #{servingToken + 1}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button title="Call Next Patient" onPress={handleCallNext} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Start Consultation" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/(doctor)/queue')} />
            <Button title="Reset Queue" variant="ghost" style={{ flex: 1 }} onPress={handleResetQueue} />
          </View>
        </Card>

        <LabelEyebrow>TODAY'S APPOINTMENTS</LabelEyebrow>
        <Card style={{ padding: todaysAppointments.length === 0 ? 16 : 4 }}>
          {todaysAppointments.length === 0 ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.inkFaint }}>No appointments booked for today yet.</Text>
            </View>
          ) : (
            todaysAppointments.map((a) => (
              <View key={a.id} style={styles.aptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aptName}>{a.patientName}</Text>
                  <Text style={styles.aptSub}>Token #{a.token} · {a.time}</Text>
                </View>
                <Pill color={a.status === 'completed' ? 'success' : a.status === 'cancelled' ? 'red' : 'blue'}>{a.status.toUpperCase()}</Pill>
              </View>
            ))
          )}
        </Card>
      </Screen>
      <DoctorNav active="/(doctor)/dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontSize: 11.5, color: colors.inkFaint },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '47%', padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 9, color: colors.inkFaint, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  tokenCard: { padding: 16, marginBottom: 16 },
  tokenRow: { flexDirection: 'row', alignItems: 'center' },
  tokenDivider: { width: 1, height: 44, backgroundColor: colors.line },
  tokenNum: { fontSize: 30, fontWeight: '800', color: colors.red, marginTop: 4 },
  tokenSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  aptRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  aptName: { fontWeight: '700', fontSize: 13, color: colors.ink },
  aptSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
});

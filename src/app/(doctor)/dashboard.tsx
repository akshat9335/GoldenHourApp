import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, DoctorNav, HTitle, LabelEyebrow, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById, APPOINTMENTS } from '@/constants/doctorData';
import { api } from '@/services/api';
import LanguageSelector from '@/components/LanguageSelector';

export default function DoctorDashboard() {
  const userProfile = useAppStore((s) => s.userProfile);
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);

  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  const [isClinicOpen, setIsClinicOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'completed'>('waiting');
  const doctorName = doctorDetails?.name || userProfile?.doctorName || userProfile?.name || 'Dr. Medical Practitioner';

  const normalizeDocId = (raw?: string) => {
    if (!raw) return 'doc-1';
    let clean = raw.trim();
    while (clean.startsWith('doc-doc-')) clean = clean.replace('doc-doc-', 'doc-');
    if (clean === 'doc-demo-1') return 'doc-1';
    if (!clean.startsWith('doc-')) return `doc-${clean}`;
    return clean;
  };

  const doctorId = normalizeDocId(userProfile?.uid);
  const defaultDoctor = getDoctorById('doc-1');
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadDoctorData = (resolvedId: string) => {
      const cleanId = normalizeDocId(resolvedId);

      // Fetch live queue
      api.queues
        .getLiveQueue(cleanId)
        .then((qRes: any) => {
          const q = (qRes && typeof qRes === 'object' && 'servingToken' in qRes) ? qRes : (qRes?.data || qRes);
          if (mounted && q && typeof q.servingToken === 'number') {
            useAppStore.setState({ servingToken: q.servingToken });
          }
        })
        .catch(() => {});

      // Fetch real appointments
      api.appointments
        .getDoctorAppointments({ doctorId: cleanId })
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
          if (doc.availability) {
            setIsClinicOpen(doc.availability !== 'OFFLINE');
          }
          loadDoctorData(doc.doctorId || doctorId);
        } else {
          loadDoctorData(doctorId);
        }
      })
      .catch(() => {
        loadDoctorData(doctorId);
      });

    const pollTimer = setInterval(() => {
      loadDoctorData(doctorId);
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(pollTimer);
    };
  }, [userProfile?.uid, doctorId]);

  const handleToggleClinic = async () => {
    if (isClinicOpen) {
      const unservedCount = activeAppointments.filter((a) => a.token > servingToken).length;
      Alert.alert(
        'Close OPD / End Day',
        unservedCount > 0
          ? `You have ${unservedCount} unserved patient(s) waiting in queue. Closing the clinic will automatically roll them over to tomorrow's priority queue. Proceed to close?`
          : 'Are you sure you want to close OPD and pause new patient token bookings for today?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Close OPD & Rollover',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.doctors.closeClinicAndRollover();
                setIsClinicOpen(false);
                Alert.alert('OPD Closed', 'Clinic is closed. Unserved patients have been rolled over to tomorrow\'s priority queue.');
              } catch (err: any) {
                Alert.alert('Notice', 'Clinic closed for new token bookings.');
                setIsClinicOpen(false);
              }
            },
          },
        ]
      );
    } else {
      try {
        await api.doctors.updateAvailability('AVAILABLE');
        setIsClinicOpen(true);
        Alert.alert('OPD Opened', 'Clinic is now OPEN. Patients can book tokens and join the queue.');
      } catch {
        setIsClinicOpen(true);
      }
    }
  };

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
    const unservedCount = activeAppointments.filter((a) => a.token > servingToken).length;
    if (unservedCount > 0) {
      Alert.alert(
        '⚠️ Active Patients in Queue',
        `There are currently ${unservedCount} patient(s) waiting in queue. Resetting the queue to 0 will break their turn sequence.\n\nWhat would you like to do?`,
        [
          { text: 'Keep Queue', style: 'cancel' },
          {
            text: 'Rollover & Reset',
            onPress: async () => {
              try {
                await api.doctors.closeClinicAndRollover();
                setIsClinicOpen(false);
                await api.queues.resetQueue(doctorId);
                useAppStore.setState({ servingToken: 0 });
                Alert.alert('Queue Rolled Over', `${unservedCount} patients shifted to tomorrow's priority queue and queue reset to 0.`);
              } catch {
                useAppStore.setState({ servingToken: 0 });
              }
            },
          },
          {
            text: 'Force Reset',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.queues.resetQueue(doctorId);
                useAppStore.setState({ servingToken: 0 });
              } catch {
                useAppStore.setState({ servingToken: 0 });
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Reset Queue Counter',
        'Queue is clear. Reset current serving token counter back to 0 for next session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset to 0',
            onPress: async () => {
              try {
                await api.queues.resetQueue(doctorId);
                useAppStore.setState({ servingToken: 0 });
              } catch {
                useAppStore.setState({ servingToken: 0 });
              }
            },
          },
        ]
      );
    }
  };

  const SEED_APPOINTMENTS = [
    {
      id: 'apt-seed-1',
      doctorId: doctorId,
      patientName: 'Rahul Patel (Cardiology Consult)',
      date: 'Today',
      time: '10:30 AM',
      token: 1,
      status: 'completed' as const,
    },
    {
      id: 'apt-seed-2',
      doctorId: doctorId,
      patientName: 'Pooja Verma (Post-Op Trauma)',
      date: 'Today',
      time: '11:15 AM',
      token: 2,
      status: 'upcoming' as const,
    },
    {
      id: 'apt-seed-3',
      doctorId: doctorId,
      patientName: 'Amit Singh (Emergency Follow-up)',
      date: 'Today',
      time: '12:00 PM',
      token: 3,
      status: 'upcoming' as const,
    },
  ];

  const todaysAppointments = appointments.length > 0 ? appointments : SEED_APPOINTMENTS;
  const completedAppointments = todaysAppointments.filter(
    (a) => a.status === 'completed' || (servingToken > 0 && a.token < servingToken)
  );
  const activeAppointments = todaysAppointments.filter((a) => {
    const isDone = a.status === 'completed' || (servingToken > 0 && a.token < servingToken);
    return !isDone && a.status !== 'cancelled';
  });
  const waitingToday = activeAppointments.filter((a) => servingToken === 0 || a.token > servingToken).length;
  const totalToday = Math.max(todaysAppointments.length, servingToken);
  const completedToday = completedAppointments.length;
  const remainingToday = activeAppointments.length;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <HTitle size={17}>{doctorName}</HTitle>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LanguageSelector />
            <Pressable style={styles.switchRoleBtn} onPress={() => router.replace('/role-selection')}>
              <Text style={styles.switchRoleText}>‹ Switch Role</Text>
            </Pressable>
            <Pressable style={styles.bellBtn} onPress={() => router.push('/(doctor)/notifications')}>
              <Icon name="bell" />
            </Pressable>
          </View>
        </View>

        {/* OPD Clinic Status Control */}
        <View style={styles.clinicStatusBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[styles.statusDot, { backgroundColor: isClinicOpen ? colors.success : colors.red }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicStatusTitle}>
                OPD STATUS: {isClinicOpen ? 'OPEN' : 'CLOSED'}
              </Text>
              <Text style={styles.clinicStatusSubtitle}>
                {isClinicOpen ? 'Accepting patient bookings & tokens' : 'Token booking paused · Rolled over'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.toggleClinicBtn, { backgroundColor: isClinicOpen ? '#FEE2E2' : '#DCFCE7' }]}
            onPress={handleToggleClinic}
          >
            <Text style={[styles.toggleClinicText, { color: isClinicOpen ? colors.red : colors.success }]}>
              {isClinicOpen ? 'Close OPD' : 'Open OPD'}
            </Text>
          </TouchableOpacity>
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

        {/* Tab switch between Waiting Queue and Completed */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'waiting' && styles.tabButtonActive]}
            onPress={() => setActiveTab('waiting')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'waiting' && styles.tabButtonTextActive]}>
              🕒 Waiting Queue ({activeAppointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
              ✅ Completed ({completedAppointments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'waiting' ? (
          <Card style={{ padding: activeAppointments.length === 0 ? 16 : 4 }}>
            {activeAppointments.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>✓ No patients waiting right now</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 4 }}>
                  {isClinicOpen ? 'New tokens booked by patients will appear here.' : 'Clinic is currently closed.'}
                </Text>
              </View>
            ) : (
              activeAppointments.map((a) => {
                const isServing = a.token === servingToken;
                return (
                  <View key={a.id} style={styles.aptRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aptName}>{a.patientName}</Text>
                      <Text style={styles.aptSub}>Token #{a.token} · {a.time}</Text>
                    </View>
                    <Pill color={isServing ? 'amber' : 'blue'}>
                      {isServing ? 'NOW SERVING' : 'WAITING'}
                    </Pill>
                  </View>
                );
              })
            )}
          </Card>
        ) : (
          <Card style={{ padding: completedAppointments.length === 0 ? 16 : 4 }}>
            {completedAppointments.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkFaint }}>No consultations completed yet today</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 4 }}>Patients marked completed will show here separately.</Text>
              </View>
            ) : (
              completedAppointments.map((a) => (
                <View key={a.id} style={styles.aptRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aptName}>{a.patientName}</Text>
                    <Text style={styles.aptSub}>Token #{a.token} · {a.time}</Text>
                  </View>
                  <Pill color="success">COMPLETED</Pill>
                </View>
              ))
            )}
          </Card>
        )}
      </Screen>
      <DoctorNav active="/(doctor)/dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { fontSize: 11.5, color: colors.inkFaint },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  switchRoleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: colors.line },
  switchRoleText: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft },
  clinicStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 16,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  clinicStatusTitle: { fontSize: 12.5, fontWeight: '800', color: colors.ink },
  clinicStatusSubtitle: { fontSize: 10.5, color: colors.inkFaint, marginTop: 1 },
  toggleClinicBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleClinicText: { fontSize: 11.5, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '47%', padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 9, color: colors.inkFaint, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  tokenCard: { padding: 16, marginBottom: 16 },
  tokenRow: { flexDirection: 'row', alignItems: 'center' },
  tokenDivider: { width: 1, height: 44, backgroundColor: colors.line },
  tokenNum: { fontSize: 30, fontWeight: '800', color: colors.red, marginTop: 4 },
  tokenSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.inkFaint,
  },
  tabButtonTextActive: {
    color: colors.ink,
  },
  aptRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  aptName: { fontWeight: '700', fontSize: 13, color: colors.ink },
  aptSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
});

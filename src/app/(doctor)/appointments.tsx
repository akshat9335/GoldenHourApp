import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Chip, DoctorNav } from '@/components/ui';
import { APPOINTMENTS } from '@/constants/doctorData';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

const TABS = ['Today', 'Upcoming', 'Completed', 'Cancelled'] as const;

const tabColor: Record<string, 'blue' | 'success' | 'grey'> = {
  upcoming: 'blue',
  completed: 'success',
  cancelled: 'grey',
};

export default function DoctorAppointments() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Today');
  const userProfile = useAppStore((s) => s.userProfile);
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;

    const loadAppts = (resolvedDocId: string) => {
      api.appointments
        .getDoctorAppointments({ doctorId: resolvedDocId })
        .then((data: any) => {
          if (mounted && Array.isArray(data)) {
            const todayIso = new Date().toISOString().split('T')[0];
            const mapped = data.map((a: any) => {
              const rawStatus = (a.status || 'CONFIRMED').toUpperCase();
              const normalizedStatus: 'upcoming' | 'completed' | 'cancelled' =
                rawStatus === 'COMPLETED'
                  ? 'completed'
                  : rawStatus === 'CANCELLED' || rawStatus === 'NO_SHOW'
                  ? 'cancelled'
                  : 'upcoming';

              return {
                id: a.appointmentId || a.id,
                doctorId: a.doctorId,
                patientName: a.patientName || 'Patient',
                date: a.date === todayIso ? 'Today' : a.date,
                time: a.timeSlot || '10:00 AM',
                token: a.tokenNumber || 1,
                status: normalizedStatus,
              };
            });
            setAppointmentsList(mapped);
          }
        })
        .catch(() => {});
    };

    api.doctors
      .getMyProfile()
      .then((res: any) => {
        const doc = (res && typeof res === 'object' && ('doctorId' in res || 'name' in res)) ? res : (res?.data || res);
        const resolvedId = doc?.doctorId || (userProfile?.uid ? `doc-${userProfile.uid}` : 'doc-1');
        loadAppts(resolvedId);
      })
      .catch(() => {
        const resolvedId = userProfile?.uid ? `doc-${userProfile.uid}` : 'doc-1';
        loadAppts(resolvedId);
      });

    return () => {
      mounted = false;
    };
  }, [userProfile?.uid]);

  const list = appointmentsList.filter((a) => {
    if (tab === 'Today') return a.date === 'Today';
    if (tab === 'Upcoming') return a.status === 'upcoming';
    if (tab === 'Completed') return a.status === 'completed';
    return a.status === 'cancelled';
  });

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Appointments" back={false} />
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>
        {list.length === 0 ? (
          <Text style={styles.empty}>No appointments in this list.</Text>
        ) : (
          list.map((a) => (
            <Card key={a.id} style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.name}>{a.patientName}</Text>
                <Pill color={tabColor[a.status]}>{a.status.toUpperCase()}</Pill>
              </View>
              <Text style={styles.sub}>Token #{a.token} · {a.date}, {a.time}</Text>
            </Card>
          ))
        )}
      </Screen>
      <DoctorNav active="/(doctor)/appointments" />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  card: { padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
  empty: { fontSize: 12.5, color: colors.inkFaint, textAlign: 'center', marginTop: 30 },
});

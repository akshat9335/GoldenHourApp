import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Chip, DoctorNav, Button } from '@/components/ui';
import { APPOINTMENTS } from '@/constants/doctorData';

const TABS = ['Today', 'Upcoming', 'Completed', 'Cancelled'] as const;

const tabColor: Record<string, 'blue' | 'success' | 'grey'> = {
  upcoming: 'blue',
  completed: 'success',
  cancelled: 'grey',
};

export default function DoctorAppointments() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Today');

  const list = APPOINTMENTS.filter((a) => {
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
              {a.status !== 'cancelled' && (
                <View style={{ marginTop: 10 }}>
                  <Button
                    title="📹 Start Video Consultation"
                    variant="success"
                    onPress={() => router.push(`/(doctor)/teleconsultation/tc_${a.token}` as any)}
                  />
                </View>
              )}
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

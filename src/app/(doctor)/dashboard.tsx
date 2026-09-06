import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, DoctorNav, HTitle, LabelEyebrow, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById, APPOINTMENTS } from '@/constants/doctorData';

export default function DoctorDashboard() {
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);
  const doctor = getDoctorById('doc-1');
  const todaysAppointments = APPOINTMENTS.filter((a) => a.doctorId === doctor.id && a.date === 'Today');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <HTitle size={17}>{doctor.name}</HTitle>
          </View>
          <Pressable style={styles.bellBtn} onPress={() => router.push('/(doctor)/notifications')}>
            <Icon name="bell" />
          </Pressable>
        </View>

        <LabelEyebrow>TODAY'S SUMMARY</LabelEyebrow>
        <View style={styles.statsGrid}>
          <Card style={styles.stat}><Text style={styles.statNum}>24</Text><Text style={styles.statLabel}>PATIENTS TODAY</Text></Card>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.success }]}>11</Text><Text style={styles.statLabel}>COMPLETED</Text></Card>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.amber }]}>7</Text><Text style={styles.statLabel}>WAITING</Text></Card>
          <Card style={styles.stat}><Text style={styles.statNum}>13</Text><Text style={styles.statLabel}>REMAINING</Text></Card>
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
            <Button title="Call Next Patient" onPress={advanceServingToken} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Start Consultation" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/(doctor)/queue')} />
            <Button title="Pause Queue" variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/(doctor)/queue')} />
          </View>
        </Card>

        <LabelEyebrow>TODAY'S APPOINTMENTS</LabelEyebrow>
        <Card style={{ padding: 4 }}>
          {todaysAppointments.map((a) => (
            <View key={a.id} style={styles.aptRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aptName}>{a.patientName}</Text>
                <Text style={styles.aptSub}>Token #{a.token} · {a.time}</Text>
              </View>
              <Pill color="blue">{a.status.toUpperCase()}</Pill>
            </View>
          ))}
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

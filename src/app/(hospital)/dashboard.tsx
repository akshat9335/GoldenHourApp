import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, HospitalNav, HTitle, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function HospitalDashboard() {
  const aiSeverity = useAppStore((s) => s.aiSeverity);
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <HTitle size={17}>St. Martha's — ER</HTitle>
          <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')}>
            <Icon name="bell" />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(hospital)/request-detail')}>
          <Card style={[styles.incomingCard, aiSeverity === 'critical' && { borderColor: colors.red }]}>
            <View style={styles.rowTop}>
              <Pill color="red">INCOMING · HIGH</Pill>
              <Text style={styles.eta}>ETA 6 min</Text>
            </View>
            <Text style={styles.incomingName}>Akshat Srivastava · Suspected Cardiac Event</Text>
          </Card>
        </Pressable>

        <View style={styles.statsRow}>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.red }]}>1</Text><Text style={styles.statLabel}>CRITICAL</Text></Card>
          <Card style={styles.stat}><Text style={styles.statNum}>14/20</Text><Text style={styles.statLabel}>BEDS</Text></Card>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.success }]}>4</Text><Text style={styles.statLabel}>ICU FREE</Text></Card>
        </View>

        <LabelEyebrow>EMERGENCY DEPARTMENT STATUS</LabelEyebrow>
        <Card style={{ padding: 14 }}>
          <View style={styles.statusRow}><Text style={styles.statusLabel}>Trauma Bay</Text><Pill color="amber">2/3 occupied</Pill></View>
          <View style={styles.statusRow}><Text style={styles.statusLabel}>On-call Surgeon</Text><Pill color="success">Available</Pill></View>
        </Card>
      </Screen>
      <HospitalNav active="/(hospital)/dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  incomingCard: { padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.line },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  incomingName: { fontWeight: '700', fontSize: 13.5, marginTop: 8, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 9.5, color: colors.inkFaint, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: colors.ink },
});

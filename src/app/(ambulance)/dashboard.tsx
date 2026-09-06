import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, LabelEyebrow, HTitle } from '@/components/ui';

export default function AmbulanceDashboard() {
  return (
    <Screen>
      <View style={styles.header}>
        <HTitle size={17}>Unit KA-05-AB</HTitle>
        <Pill color="success">ON DUTY</Pill>
      </View>
      <Pressable onPress={() => router.push('/(ambulance)/request-detail')}>
        <Card style={styles.card}>
          <View style={styles.rowTop}>
            <Pill color="red">NEW REQUEST · HIGH</Pill>
            <Text style={styles.dist}>2.1 km</Text>
          </View>
          <Text style={styles.pickup}>Pickup: Koramangala 5th Block</Text>
        </Card>
      </Pressable>
      <LabelEyebrow>SHIFT SUMMARY</LabelEyebrow>
      <View style={styles.statsRow}>
        <Card style={styles.stat}><Text style={styles.statNum}>3</Text><Text style={styles.statLabel}>TRIPS TODAY</Text></Card>
        <Card style={styles.stat}><Text style={styles.statNum}>92%</Text><Text style={styles.statLabel}>FUEL</Text></Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  card: { padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.red },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  dist: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  pickup: { fontWeight: '700', fontSize: 13.5, marginTop: 8, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 9.5, color: colors.inkFaint, fontWeight: '700' },
});

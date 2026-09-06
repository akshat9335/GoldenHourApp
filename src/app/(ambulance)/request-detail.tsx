import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill } from '@/components/ui';

export default function AmbulanceRequestDetail() {
  return (
    <Screen>
      <TopBar title="Request Detail" />
      <Card style={styles.card}>
        <Pill color="red">HIGH SEVERITY</Pill>
        <Text style={styles.name}>Akshat Srivastava · Suspected Cardiac Event</Text>
        <Text style={styles.sub}>Pickup: Koramangala 5th Block · 2.1 km</Text>
      </Card>
      <Button title="Accept Request" onPress={() => router.push('/(ambulance)/navigate-patient')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14, gap: 4 },
  name: { fontWeight: '700', fontSize: 13.5, marginTop: 10, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 4 },
});

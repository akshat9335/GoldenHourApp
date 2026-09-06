import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill } from '@/components/ui';

export default function AiHospitalRec() {
  return (
    <Screen>
      <TopBar title="Hospital Recommendation" />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>St. Martha's Hospital</Text>
          <Pill color="success">MATCH</Pill>
        </View>
        <Text style={styles.sub}>Cardiac Care Unit · Level 1 Trauma · 3.4 km</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pill color="blue">ICU: 4 beds</Pill>
          <Pill color="grey">ETA 11 min</Pill>
        </View>
      </Card>
      <Button title="Continue to Confirmation" onPress={() => router.push('/(patient)/emergency/review')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: colors.red },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginVertical: 8 },
});

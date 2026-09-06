import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, HospitalNav } from '@/components/ui';

export default function HospitalRequests() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Emergency Requests" back={false} />
        <Pressable onPress={() => router.push('/(hospital)/request-detail')}>
          <Card style={styles.card}>
            <View style={styles.row}><Pill color="red">HIGH</Pill><Text style={styles.eta}>ETA 6 min</Text></View>
            <Text style={styles.name}>Akshat Srivastava</Text>
          </Card>
        </Pressable>
        <Card style={styles.card}>
          <View style={styles.row}><Pill color="amber">MEDIUM</Pill><Text style={styles.eta}>ETA 15 min</Text></View>
          <Text style={styles.name}>Unnamed Patient — Fall Injury</Text>
        </Card>
      </Screen>
      <HospitalNav active="/(hospital)/requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { fontSize: 11, color: colors.inkFaint },
  name: { fontWeight: '700', fontSize: 13, marginTop: 8, color: colors.ink },
});

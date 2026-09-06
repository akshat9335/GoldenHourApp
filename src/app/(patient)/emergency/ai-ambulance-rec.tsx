import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Banner, Icon } from '@/components/ui';

export default function AiAmbulanceRec() {
  return (
    <Screen>
      <TopBar title="Ambulance Recommendation" />
      <Banner color="red" icon={<Icon name="ambulance" size={15} color={colors.redDark} />}>
        Based on severity, an ALS (Advanced Life Support) ambulance is recommended.
      </Banner>
      <View style={{ height: 16 }} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>ALS Ambulance</Text>
          <Pill color="red">RECOMMENDED</Pill>
        </View>
        <Text style={styles.sub}>Nearest unit: 2.1 km · ETA 6 min</Text>
      </Card>
      <Button title="Continue" onPress={() => router.push('/(patient)/emergency/ai-hospital-rec')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 6 },
});

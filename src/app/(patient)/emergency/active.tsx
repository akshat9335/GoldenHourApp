import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, Card, Pill, Stepper, Banner, Icon, HTitle } from '@/components/ui';
import { AMB_STEPS } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';

export default function Active() {
  const ambStatus = useAppStore((s) => s.ambStatus);
  const setAmbStatus = useAppStore((s) => s.setAmbStatus);
  const step = AMB_STEPS[ambStatus];
  const elapsed = 2 + ambStatus * 3;
  const isLast = ambStatus >= AMB_STEPS.length - 1;

  return (
    <Screen>
      <View style={styles.topRow}>
        <Pill color="red">EMERGENCY ACTIVE</Pill>
        <Text style={styles.elapsed}>{elapsed} min elapsed</Text>
      </View>
      <Card style={styles.statusCard}>
        <Text style={styles.statusLabel}>CURRENT STATUS</Text>
        <HTitle size={17}>{step}</HTitle>
        <Text style={styles.eta}>ETA to next step: {!isLast ? '4 min' : '—'}</Text>
      </Card>
      <Card style={styles.stepperCard}>
        <Stepper steps={AMB_STEPS} currentIndex={ambStatus} />
      </Card>
      <View style={styles.pairRow}>
        <Card style={styles.pairCard}>
          <Icon name="ambulance" />
          <Text style={styles.pairLabel}>Unit KA-05-AB</Text>
        </Card>
        <Card style={styles.pairCard}>
          <Icon name="hospital" />
          <Text style={styles.pairLabel}>St. Martha's</Text>
        </Card>
      </View>
      <Banner color="success" icon={<Icon name="check" size={14} color={colors.success} />}>
        Meera Srivastava and Rohan Gupta are receiving live location updates.
      </Banner>
      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Track on Map" variant="secondary" onPress={() => router.push('/(patient)/live-map')} />
        {isLast ? (
          <Button title="Complete" onPress={() => router.replace('/(patient)/emergency/completed')} />
        ) : (
          <Button title="Advance Status →" onPress={() => setAmbStatus((n) => n + 1)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  elapsed: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  statusCard: { padding: 16, marginBottom: 16, alignItems: 'center' },
  statusLabel: { fontSize: 11, color: colors.inkFaint, fontWeight: '700', letterSpacing: 0.5 },
  eta: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  stepperCard: { padding: 16, marginBottom: 16 },
  pairRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pairCard: { flex: 1, padding: 12, alignItems: 'center', gap: 6 },
  pairLabel: { fontSize: 11, fontWeight: '700', color: colors.ink },
});

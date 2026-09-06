import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Stepper, Icon } from '@/components/ui';

const STEPS = ['Emergency accepted', 'Team & bay assigned', 'Awaiting patient arrival'];

export default function HospitalReady() {
  return (
    <Screen>
      <TopBar title="Hospital Ready" />
      <Card style={styles.card}>
        <Icon name="check" color={colors.success} />
        <Text style={styles.cardText}>Trauma Bay 2 Prepared</Text>
      </Card>
      <Stepper steps={STEPS} currentIndex={2} />
      <Button title="Mark Patient Arrived" onPress={() => router.push('/(hospital)/completed')} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14, backgroundColor: colors.successBg, borderWidth: 0, alignItems: 'center', gap: 8 },
  cardText: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
});

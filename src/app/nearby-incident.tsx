import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, LabelEyebrow, CommunityConfirmation } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function NearbyIncident() {
  const confirmationCount = useAppStore((s) => s.confirmationCount);
  const hasConfirmedIncident = useAppStore((s) => s.hasConfirmedIncident);
  const confirmIncident = useAppStore((s) => s.confirmIncident);

  return (
    <Screen>
      <TopBar title="Nearby Incident" />
      <Card style={styles.card}>
        <Pill color="orange">ACCIDENT · HIGH</Pill>
        <Text style={styles.location}>2.3 km away · Koramangala, Bengaluru</Text>
        <Text style={styles.time}>Reported 4 minutes ago</Text>
      </Card>

      <LabelEyebrow>DESCRIPTION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={styles.bodyText}>Not provided</Text>
      </Card>

      <LabelEyebrow>PHOTO</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={styles.emptyText}>No photo provided</Text>
      </Card>

      <CommunityConfirmation count={confirmationCount} confirmed={hasConfirmedIncident} onConfirm={confirmIncident} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16, gap: 6 },
  location: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 6 },
  time: { fontSize: 11, color: colors.inkFaint },
  textCard: { padding: 14, marginBottom: 16 },
  bodyText: { fontSize: 12.5, color: colors.inkSoft },
  emptyText: { fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic' },
});

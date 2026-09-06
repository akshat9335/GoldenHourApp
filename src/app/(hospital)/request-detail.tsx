import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Divider, Icon, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

// Mock stand-in for the backend-provided case payload:
// { goldenHourId, trustScore, confirmationCount, description, voiceTranscript,
//   imageUrl, aiTriage, aiImageAnalysis, severity, location }
// Swap these placeholders for the real fields once the backend is wired up.
const MOCK_CASE = {
  goldenHourId: null as string | null, // e.g. 'GH-8F42K1' once backend assigns it
  trustScore: null as number | null,
  description: 'Chest pain radiating to left arm, shortness of breath, sweating.',
  voiceTranscript: null as string | null,
  imageUrl: null as string | null,
  aiTriage: 'Suspected Cardiac Event',
  aiImageAnalysis: null as string | null,
};

export default function HospitalRequestDetail() {
  const confirmationCount = useAppStore((s) => s.confirmationCount);
  const c = MOCK_CASE;

  return (
    <Screen>
      <TopBar title="Incoming Patient" />

      <LabelEyebrow>PATIENT INFORMATION</LabelEyebrow>
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color="red">HIGH SEVERITY</Pill>
          <Text style={styles.eta}>ETA 6 min</Text>
        </View>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <Text style={styles.name}>Akshat Srivastava · 29 · Male</Text>
        <Text style={styles.sub}>Blood group O+ · Allergic to Penicillin</Text>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <MiniRow label="Golden Hour ID" value={c.goldenHourId ?? 'Not available yet'} />
        <MiniRow label="Trust Score" value={c.trustScore != null ? `${c.trustScore} / 100` : 'Not calculated yet'} last />
      </Card>

      <LabelEyebrow>INCIDENT INFORMATION</LabelEyebrow>
      <Card style={styles.card}>
        <MiniRow label="Incident Type" value="Road Accident" />
        <MiniRow label="Location" value="Koramangala, Bengaluru" />
        <MiniRow label="Time" value="Just now" />
        <MiniRow label="Severity" value="High" last />
      </Card>

      <LabelEyebrow>PATIENT DESCRIPTION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={c.description ? styles.bodyText : styles.emptyText}>
          {c.description || 'Not provided'}
        </Text>
      </Card>

      <LabelEyebrow>ACCIDENT PHOTO</LabelEyebrow>
      <Card style={styles.textCard}>
        {c.imageUrl ? (
          <Image source={{ uri: c.imageUrl }} style={styles.photo} />
        ) : (
          <Text style={styles.emptyText}>No photo provided</Text>
        )}
      </Card>

      <LabelEyebrow>VOICE DESCRIPTION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={c.voiceTranscript ? styles.bodyText : styles.emptyText}>
          {c.voiceTranscript || 'No voice description provided'}
        </Text>
      </Card>

      <LabelEyebrow>AI ASSESSMENT</LabelEyebrow>
      <Card style={styles.assessCard}>
        {c.aiTriage ? (
          <>
            <Text style={styles.assessTitle}>{c.aiTriage}</Text>
            <Text style={styles.assessDesc}>{c.description}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>AI assessment unavailable</Text>
        )}
      </Card>

      <LabelEyebrow>AI IMAGE ASSESSMENT</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={c.aiImageAnalysis ? styles.bodyText : styles.emptyText}>
          {c.aiImageAnalysis || 'Image analysis not available'}
        </Text>
      </Card>

      <LabelEyebrow>COMMUNITY CONFIRMATION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={confirmationCount > 0 ? styles.bodyText : styles.emptyText}>
          {confirmationCount > 0 ? `Confirmed by ${confirmationCount} users` : 'No confirmations yet'}
        </Text>
      </Card>

      <LabelEyebrow>AMBULANCE ETA</LabelEyebrow>
      <Card style={styles.ambCard}>
        <Icon name="ambulance" />
        <View style={{ flex: 1 }}>
          <Text style={styles.ambName}>Unit KA-05-AB</Text>
          <Text style={styles.ambSub}>4.1 km · 6 min</Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Reject" variant="secondary" onPress={() => router.push('/(hospital)/rejected')} />
        <Button title="Accept Emergency" onPress={() => router.push('/(hospital)/accepted')} />
      </View>
    </Screen>
  );
}

function MiniRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.miniRow, last && { marginBottom: 0 }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  name: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  textCard: { padding: 14, marginBottom: 16 },
  bodyText: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },
  emptyText: { fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic' },
  photo: { width: '100%', height: 160, borderRadius: 14, backgroundColor: colors.grey },
  assessCard: { padding: 14, marginBottom: 16 },
  assessTitle: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  assessDesc: { fontSize: 11.5, color: colors.inkSoft, marginTop: 6 },
  ambCard: { padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  ambName: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  ambSub: { fontSize: 10.5, color: colors.inkFaint },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  miniLabel: { fontSize: 11.5, color: colors.inkFaint },
  miniValue: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
});

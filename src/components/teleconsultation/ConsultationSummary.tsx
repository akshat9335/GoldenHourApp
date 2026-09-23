import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';
import { subscribePrescriptions, type Prescription } from '@/services/teleconsultation';

interface Props { consultationId: string }

const fmt = (ms?: number) => (ms ? new Date(ms).toLocaleString() : '—');

/**
 * Read-only post-call summary: shared by both patient and doctor.
 */
export const ConsultationSummary = ({ consultationId }: Props) => {
  const [rxs, setRxs] = useState<Prescription[]>([]);
  useEffect(() => subscribePrescriptions(consultationId, setRxs), [consultationId]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Consultation Summary</Text>
      {rxs.length === 0 ? (
        <Text style={styles.empty}>No prescriptions issued yet.</Text>
      ) : (
        rxs.map((p) => (
          <View key={p.id} style={styles.card}>
            <Text style={styles.rxId}>Prescription #{p.id.slice(-6)}</Text>
            <Text style={styles.meta}>
              {fmt(p.createdAt)} · status: {p.status}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 14, ...shadow.card },
  title: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
  empty: { color: colors.inkSoft },
  card: { borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 8 },
  rxId: { fontWeight: '600', color: colors.ink },
  meta: { color: colors.inkSoft, fontSize: 12 },
});

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';
import {
  createPrescription, addPrescriptionItem, issuePrescription,
  type PrescriptionItem,
} from '@/services/teleconsultation';

interface Props {
  consultationId: string;
  doctorId: string;
  patientId: string;
}

const blank = (): PrescriptionItem => ({
  medicine: '', dosage: '', frequency: '', duration: '', instructions: '',
});

export const PrescriptionForm = ({ consultationId, doctorId, patientId }: Props) => {
  const [items, setItems] = useState<PrescriptionItem[]>([blank()]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  const update = (i: number, k: keyof PrescriptionItem, v: string) =>
    setItems((arr) => arr.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const onAddRow = () => setItems((arr) => [...arr, blank()]);

  const onIssue = async () => {
    try {
      const id = prescriptionId ?? (await createPrescription(consultationId, { doctorId, patientId }));
      for (const it of items.filter((x) => x.medicine.trim())) {
        await addPrescriptionItem(consultationId, id, it);
      }
      await issuePrescription(consultationId, id);
      setPrescriptionId(id);
      Alert.alert('Issued', `Prescription ${id} issued.`);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Prescription</Text>
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            {(['medicine', 'dosage', 'frequency', 'duration', 'instructions'] as const).map((k) => (
              <View key={k} style={styles.field}>
                <Text style={styles.label}>{k[0].toUpperCase() + k.slice(1)}</Text>
                <TextInput
                  style={styles.input}
                  value={item[k]}
                  onChangeText={(v) => update(index, k, v)}
                  placeholder={k}
                />
              </View>
            ))}
          </View>
        )}
      />
      <View style={styles.actions}>
        <Pressable onPress={onAddRow} style={[styles.btn, styles.btnGhost]}>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>+ Add medicine</Text>
        </Pressable>
        <Pressable onPress={onIssue} style={styles.btn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Issue</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 14, ...shadow.card },
  title: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
  row: { borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 10, marginBottom: 10 },
  field: { marginBottom: 6 },
  label: { color: colors.inkSoft, fontSize: 12, marginBottom: 2 },
  input: {
    backgroundColor: colors.bg, borderRadius: radii.sm,
    paddingHorizontal: 10, paddingVertical: 6, color: colors.ink,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: {
    backgroundColor: colors.blue, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radii.md, marginLeft: 8, alignItems: 'center',
  },
  btnGhost: { backgroundColor: colors.grey },
});

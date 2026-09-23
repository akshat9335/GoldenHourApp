import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';
import { subscribeNotes, saveNotes } from '@/services/teleconsultation';

interface Props {
  consultationId: string;
  doctorId: string;
  readOnly?: boolean;
}

export const DoctorNotes = ({ consultationId, doctorId, readOnly }: Props) => {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeNotes(consultationId, (n) => {
      if (n) {
        setSymptoms(n.symptoms ?? '');
        setDiagnosis(n.diagnosis ?? '');
        setAdvice(n.advice ?? '');
      }
    });
    return unsub;
  }, [consultationId]);

  const onSave = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      await saveNotes(consultationId, doctorId, { symptoms, diagnosis, advice });
      Alert.alert('Saved', 'Notes updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Doctor Notes</Text>
      {(['symptoms', 'diagnosis', 'advice'] as const).map((k) => (
        <View key={k} style={styles.field}>
          <Text style={styles.label}>{k[0].toUpperCase() + k.slice(1)}</Text>
          <TextInput
            value={k === 'symptoms' ? symptoms : k === 'diagnosis' ? diagnosis : advice}
            onChangeText={
              k === 'symptoms' ? setSymptoms : k === 'diagnosis' ? setDiagnosis : setAdvice
            }
            multiline
            editable={!readOnly}
            style={styles.input}
            placeholder={`Enter ${k}…`}
          />
        </View>
      ))}
      {!readOnly && (
        <Pressable onPress={onSave} disabled={saving} style={[styles.btn, saving && { opacity: 0.6 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save Notes'}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 14, ...shadow.card },
  title: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
  field: { marginBottom: 10 },
  label: { color: colors.inkSoft, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md, padding: 10, minHeight: 60, color: colors.ink,
    textAlignVertical: 'top',
  },
  btn: {
    backgroundColor: colors.blue, padding: 12, borderRadius: radii.md,
    alignItems: 'center', marginTop: 6,
  },
});

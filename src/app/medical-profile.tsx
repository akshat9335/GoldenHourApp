import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, LabelEyebrow } from '@/components/ui';

export default function MedicalProfile() {
  return (
    <Screen>
      <TopBar title="Medical Information" />
      <Card style={styles.idCard}>
        <View style={styles.idRow}>
          <View>
            <Text style={styles.idLabel}>MEDICAL ID</Text>
            <Text style={styles.idName}>Akshat Srivastava</Text>
          </View>
          <Text style={styles.bloodGroup}>O+</Text>
        </View>
      </Card>
      <LabelEyebrow>ALLERGIES</LabelEyebrow>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Pill color="amber">Penicillin</Pill>
        <Pill color="amber">Peanuts</Pill>
      </View>
      <LabelEyebrow>CONDITIONS</LabelEyebrow>
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <Text style={styles.condition}>Asthma — mild</Text>
      </Card>
      <Button title="Edit Medical Information" variant="secondary" onPress={() => router.push('/medical-setup')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  idCard: { padding: 16, backgroundColor: '#FDEEEE', borderWidth: 1.5, borderColor: '#F5C6C6', marginBottom: 16 },
  idRow: { flexDirection: 'row', justifyContent: 'space-between' },
  idLabel: { fontSize: 9.5, fontWeight: '700', color: colors.red, letterSpacing: 1 },
  idName: { fontSize: 15, fontWeight: '800', marginTop: 2, color: colors.ink },
  bloodGroup: { fontSize: 22, fontWeight: '800', color: colors.red },
  condition: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
});

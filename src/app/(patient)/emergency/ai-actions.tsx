import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Divider, Icon, LabelEyebrow } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';

export default function AiActions() {
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const aiImageResult = useAppStore((s) => s.aiImageResult);

  const immediateActions: string[] =
    Array.isArray(aiTriageResult?.immediateActions) && aiTriageResult.immediateActions.length > 0
      ? aiTriageResult.immediateActions
      : Array.isArray(aiImageResult?.immediateActions) && aiImageResult.immediateActions.length > 0
      ? aiImageResult.immediateActions
      : [
          'Keep the patient safe, calm and immobilized',
          'Apply direct firm pressure with clean cloth if external bleeding',
          'Do not move neck or spine if impact trauma or fall occurred',
          'Ensure clear airway and stay on the line until rescue crew arrives',
        ];

  const avoidActions: string[] =
    Array.isArray(aiTriageResult?.avoidActions) && aiTriageResult.avoidActions.length > 0
      ? aiTriageResult.avoidActions
      : [
          'Do not move or twist injured limbs or spine unnecessarily',
          'Do not administer oral fluids, painkillers, or food',
          'Do not leave the patient unattended',
          'Do not remove deeply embedded objects from wounds',
        ];

  return (
    <Screen>
      <TopBar title="Recommended Actions" />
      <LabelEyebrow>DO THIS NOW</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 16 }}>
        {immediateActions.map((t, i) => (
          <View key={t + i}>
            <View style={styles.row}>
              <Icon name="check" size={14} color={colors.success} />
              <Text style={styles.rowText}>{t}</Text>
            </View>
            {i < immediateActions.length - 1 && <Divider />}
          </View>
        ))}
      </Card>
      <LabelEyebrow>THINGS TO AVOID</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 16 }}>
        {avoidActions.map((t, i) => (
          <View key={t + i}>
            <View style={styles.row}>
              <Icon name="close" size={14} color={colors.redDark} />
              <Text style={styles.rowText}>{t}</Text>
            </View>
            {i < avoidActions.length - 1 && <Divider />}
          </View>
        ))}
      </Card>
      <Button title="Continue" onPress={() => router.push('/(patient)/emergency/ai-ambulance-rec')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowText: { fontSize: 12.5, flex: 1, color: colors.ink },
});

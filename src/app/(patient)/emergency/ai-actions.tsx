import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Divider, Icon, LabelEyebrow } from '@/components/ui';

const DO_NOW = [
  'Keep the person still and seated upright',
  'Loosen tight clothing around chest and neck',
  'Give aspirin only if not allergic and advised',
  'Stay on the line until help arrives',
];
const AVOID = [
  'Do not let the person walk or exert themselves',
  'Do not give food or water',
  'Do not leave the person alone',
];

export default function AiActions() {
  return (
    <Screen>
      <TopBar title="Recommended Actions" />
      <LabelEyebrow>DO THIS NOW</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 16 }}>
        {DO_NOW.map((t, i) => (
          <View key={t}>
            <View style={styles.row}>
              <Icon name="check" size={14} />
              <Text style={styles.rowText}>{t}</Text>
            </View>
            {i < DO_NOW.length - 1 && <Divider />}
          </View>
        ))}
      </Card>
      <LabelEyebrow>THINGS TO AVOID</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 16 }}>
        {AVOID.map((t, i) => (
          <View key={t}>
            <View style={styles.row}>
              <Icon name="close" size={14} color={colors.redDark} />
              <Text style={styles.rowText}>{t}</Text>
            </View>
            {i < AVOID.length - 1 && <Divider />}
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

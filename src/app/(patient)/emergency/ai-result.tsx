import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, Severity, severityColor, severityBg, severityLabel } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Chip, Banner, Icon, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

const COPY: Record<Severity, string> = {
  low: 'Symptoms suggest a low-urgency issue. Self-care and monitoring are likely appropriate.',
  medium: 'Symptoms warrant prompt medical attention within the next few hours.',
  high: 'Symptoms are consistent with a serious condition requiring urgent care.',
  critical: 'Symptoms strongly indicate a life-threatening emergency requiring immediate intervention.',
};

export default function AiResult() {
  const aiSeverity = useAppStore((s) => s.aiSeverity);
  const setAiSeverity = useAppStore((s) => s.setAiSeverity);

  return (
    <Screen>
      <TopBar title="AI Assessment Result" />
      <View style={styles.chipsRow}>
        {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
          <View key={s} style={{ flex: 1 }}>
            <Chip label={severityLabel(s)} selected={s === aiSeverity} onPress={() => setAiSeverity(s)} />
          </View>
        ))}
      </View>
      <Card style={[styles.resultCard, { backgroundColor: severityBg(aiSeverity), borderWidth: 0 }]}>
        <Text style={[styles.severityLabel, { color: severityColor(aiSeverity) }]}>SEVERITY</Text>
        <Text style={[styles.severityValue, { color: severityColor(aiSeverity) }]}>{severityLabel(aiSeverity)}</Text>
        <Text style={styles.copy}>{COPY[aiSeverity]}</Text>
      </Card>
      <LabelEyebrow>EMERGENCY CATEGORY</LabelEyebrow>
      <Card style={styles.categoryCard}><Text style={styles.categoryText}>Suspected Cardiac Event</Text></Card>
      <Button title="View Recommended Actions" onPress={() => router.push('/(patient)/emergency/ai-actions')} />
      <Banner color="blue" icon={<Icon name="ai" size={15} color={colors.blue} />}>
        AI-generated emergency decision support. This is not a medical diagnosis.
      </Banner>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  resultCard: { padding: 18, alignItems: 'center', marginBottom: 14 },
  severityLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  severityValue: { fontWeight: '800', fontSize: 26, marginVertical: 4 },
  copy: { fontSize: 11.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 17 },
  categoryCard: { padding: 14, marginBottom: 14 },
  categoryText: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
});

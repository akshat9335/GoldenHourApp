import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { colors, Severity, severityColor, severityBg, severityLabel } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Chip, Banner, Icon, LabelEyebrow, Pill } from '@/components/ui';
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
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const aiImageResult = useAppStore((s) => s.aiImageResult);
  const accidentPhotoUri = useAppStore((s) => s.accidentPhotoUri);
  const selectedType = useAppStore((s) => s.selectedType);

  const emergencyCategory =
    aiTriageResult?.emergencyType ||
    selectedType ||
    'Acute Trauma Emergency';

  const isImgAuthentic = aiImageResult?.isAuthentic !== false;
  const authenticityConfidence = Math.round(
    ((aiImageResult?.authenticityScore ?? (isImgAuthentic ? 0.95 : 0.4)) as number) * 100
  );

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
        <Text style={styles.copy}>
          {aiTriageResult?.explanation || COPY[aiSeverity]}
        </Text>
      </Card>

      <LabelEyebrow>EMERGENCY CATEGORY</LabelEyebrow>
      <Card style={styles.categoryCard}>
        <Text style={styles.categoryText}>{emergencyCategory}</Text>
      </Card>

      {/* AI Visual Image Analysis Card */}
      {aiImageResult && (
        <View style={{ marginBottom: 14 }}>
          <LabelEyebrow>AI VISUAL INCIDENT ANALYSIS</LabelEyebrow>
          <Card style={styles.imageCard}>
            <View style={styles.authBadgeRow}>
              <Pill color={isImgAuthentic ? 'success' : 'red'}>
                {isImgAuthentic ? 'GENUINE SCENE VERIFIED' : 'POSSIBLE SYNTHETIC / AI'}
              </Pill>
              <Text style={styles.authConfidence}>{authenticityConfidence}% match</Text>
            </View>

            <Text style={styles.authVerdict}>
              {aiImageResult.authenticityAssessment ||
                (isImgAuthentic
                  ? 'Real-world emergency incident photograph confirmed.'
                  : 'Image appears digital, synthetic or unrelated.')}
            </Text>

            {Array.isArray(aiImageResult.findings) && aiImageResult.findings.length > 0 && (
              <View style={styles.findingsBox}>
                <Text style={styles.findingsHeader}>OBSERVED TRAUMA FINDINGS:</Text>
                {aiImageResult.findings.map((finding: string, idx: number) => (
                  <View key={idx} style={styles.findingItem}>
                    <Text style={styles.findingBullet}>•</Text>
                    <Text style={styles.findingText}>{finding}</Text>
                  </View>
                ))}
              </View>
            )}

            {accidentPhotoUri && (
              <Image source={{ uri: accidentPhotoUri }} style={styles.photoThumb} />
            )}
          </Card>
        </View>
      )}

      <Button title="View Recommended Actions" onPress={() => router.push('/(patient)/emergency/ai-actions')} />
      <View style={{ height: 10 }} />
      <Banner color="blue" icon={<Icon name="ai" size={15} color={colors.blue} />}>
        AI-generated emergency decision support powered by Gemini Vision. This is not a medical diagnosis.
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
  imageCard: { padding: 14, marginBottom: 6 },
  authBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  authConfidence: { fontSize: 11, fontWeight: '600', color: colors.inkFaint },
  authVerdict: { fontSize: 12, color: colors.ink, fontWeight: '500', lineHeight: 17, marginBottom: 10 },
  findingsBox: { backgroundColor: colors.bg, padding: 10, borderRadius: 8, marginTop: 4, marginBottom: 10 },
  findingsHeader: { fontSize: 10, fontWeight: '700', color: colors.inkSoft, letterSpacing: 0.5, marginBottom: 6 },
  findingItem: { flexDirection: 'row', gap: 6, marginBottom: 3 },
  findingBullet: { color: colors.red, fontSize: 12, fontWeight: '700' },
  findingText: { fontSize: 11.5, color: colors.ink, flex: 1, lineHeight: 16 },
  photoThumb: { width: '100%', height: 140, borderRadius: 8, marginTop: 6, backgroundColor: colors.bg },
});

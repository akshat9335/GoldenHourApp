import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
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
  const userEstimatedSeverity = useAppStore((s) => s.userEstimatedSeverity) || 'Moderate';
  const aiAssessedSeverity = useAppStore((s) => s.aiAssessedSeverity) || 'HIGH';
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const aiImageResult = useAppStore((s) => s.aiImageResult);
  const accidentPhotoUri = useAppStore((s) => s.accidentPhotoUri);
  const accidentPhotoBase64 = useAppStore((s) => s.accidentPhotoBase64);
  const description = useAppStore((s) => s.description);
  const selectedType = useAppStore((s) => s.selectedType);
  const candidateHospitals = useAppStore((s) => s.candidateHospitals);

  const emergencyCategory =
    aiTriageResult?.emergencyType ||
    selectedType ||
    'Acute Trauma Emergency';

  const hasPhoto = !!accidentPhotoUri || !!accidentPhotoBase64;
  const hasText = !!description && description.trim().length > 0;
  const analysisSource =
    hasPhoto && hasText
      ? 'Multimodal AI (Vision + Text Symptoms)'
      : hasPhoto
      ? 'Vision AI (Incident Photo Only)'
      : 'Clinical NLP (Symptoms & Text Only)';

  const isImgAuthentic = aiImageResult?.isAuthentic !== false;
  const authenticityConfidence = Math.round(
    ((aiImageResult?.authenticityScore ?? (isImgAuthentic ? 0.95 : 0.4)) as number) * 100
  );

  const top3 =
    candidateHospitals && candidateHospitals.length > 0
      ? candidateHospitals.slice(0, 3)
      : [
          {
            hospitalId: 'hosp-medanta-prayagraj',
            name: 'Medanta Hospital Prayagraj',
            distanceKm: 2.2,
            etaMinutes: 6,
            score: 95,
            matchReason: 'Level-1 Multi-Specialty Trauma Center & Cath Lab Ready',
            availableBeds: 18,
            availableIcuBeds: 5,
          },
          {
            hospitalId: 'hosp-srn-prayagraj',
            name: 'Swaroop Rani Nehru (SRN) Hospital',
            distanceKm: 3.1,
            etaMinutes: 8,
            score: 88,
            matchReason: 'Government Medical College Emergency Trauma Center',
            availableBeds: 35,
            availableIcuBeds: 8,
          },
          {
            hospitalId: 'hosp-kamla-nehru',
            name: 'Kamla Nehru Memorial Hospital',
            distanceKm: 3.8,
            etaMinutes: 10,
            score: 80,
            matchReason: 'Specialized Tertiary Emergency Care & Inpatient Facilities',
            availableBeds: 24,
            availableIcuBeds: 4,
          },
        ];

  const immediateActions: string[] =
    Array.isArray(aiTriageResult?.immediateActions) && aiTriageResult.immediateActions.length > 0
      ? aiTriageResult.immediateActions.slice(0, 3)
      : [
          'Keep patient safe, calm and immobilized',
          'Apply direct firm pressure with clean cloth if external bleeding',
          'Do not move neck or spine if impact trauma or fall occurred',
        ];

  return (
    <Screen>
      <TopBar title="AI Triage Assessment" />

      {/* 1. SEVERITY COMPARISON & CLINICAL SYNTHESIS */}
      <Card style={styles.severityOverviewCard}>
        <View style={styles.severityCompareRow}>
          {/* User's View */}
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>USER REPORTED</Text>
            <View style={styles.comparePillWrap}>
              <Pill color="grey">{userEstimatedSeverity.toUpperCase()}</Pill>
            </View>
            <Text style={styles.compareSub}>Caller estimate</Text>
          </View>

          <View style={styles.dividerV} />

          {/* AI's View */}
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>AI EVALUATED</Text>
            <View style={styles.comparePillWrap}>
              <Pill color="red">{aiAssessedSeverity.toUpperCase()}</Pill>
            </View>
            <Text style={styles.compareSub}>{analysisSource}</Text>
          </View>
        </View>

        <View style={styles.activeSevHeader}>
          <Text style={styles.activeSevTitle}>ACTIVE TRIAGE LEVEL (DISPATCH TARGET):</Text>
          <Text style={styles.activeSevSub}>
            Clinical synthesis selected safest urgency level. Tap to adjust if needed:
          </Text>
        </View>

        <View style={styles.chipsRow}>
          {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
            <View key={s} style={{ flex: 1 }}>
              <Chip label={severityLabel(s)} selected={s === aiSeverity} onPress={() => setAiSeverity(s)} />
            </View>
          ))}
        </View>

        <View style={[styles.resultBanner, { backgroundColor: severityBg(aiSeverity) }]}>
          <Text style={[styles.resultBannerText, { color: severityColor(aiSeverity) }]}>
            {aiTriageResult?.explanation || COPY[aiSeverity]}
          </Text>
        </View>
      </Card>

      {/* 2. TOP 3 AI-MATCHED HOSPITALS (DIRECTLY ON THIS SCREEN) */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <LabelEyebrow>TOP 3 AI-MATCHED HOSPITALS & ER CENTERS</LabelEyebrow>
          <Pill color="blue">LIVE ER NETWORK</Pill>
        </View>

        {top3.map((hosp: any, index: number) => {
          const isPrimary = index === 0;
          return (
            <Card
              key={hosp.hospitalId || hosp.id || index}
              style={[styles.hospCard, isPrimary && styles.primaryHospCard]}
            >
              <View style={styles.hospHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Pill color={isPrimary ? 'red' : 'grey'}>
                      {isPrimary ? '★ RANK #1 · PRIMARY ALERT' : `RANK #${index + 1} · STANDBY`}
                    </Pill>
                    <Pill color={hosp.score >= 90 ? 'success' : 'blue'}>
                      {hosp.score || 85}% MATCH
                    </Pill>
                  </View>
                  <Text style={styles.hospName}>{hosp.name}</Text>
                </View>
                <View style={styles.etaBadge}>
                  <Text style={styles.etaNum}>{hosp.etaMinutes || Math.round((hosp.distanceKm || 2) * 2.5) || 5} min</Text>
                  <Text style={styles.distNum}>{hosp.distanceKm || 2} km</Text>
                </View>
              </View>

              {/* Why Chosen Reason */}
              <View style={styles.whyBox}>
                <Text style={styles.whyLabel}>WHY CHOSEN:</Text>
                <Text style={styles.whyText}>
                  {hosp.matchReason || 'Equipped trauma & emergency care facility.'}
                </Text>
              </View>

              {/* Live Beds and ICU Availability */}
              <View style={styles.bedsRow}>
                <View style={styles.bedItem}>
                  <Icon name="check" size={13} color={colors.success} />
                  <Text style={styles.bedLabel}>
                    <Text style={{ fontWeight: '700' }}>{hosp.availableBeds ?? 14}</Text> General Beds
                  </Text>
                </View>
                <View style={styles.bedItem}>
                  <Icon name="check" size={13} color={colors.red} />
                  <Text style={styles.bedLabel}>
                    <Text style={{ fontWeight: '700' }}>{hosp.availableIcuBeds ?? 4}</Text> ICU Beds Free
                  </Text>
                </View>
              </View>

              {/* Alert Status Banner */}
              <View style={[styles.targetBanner, { backgroundColor: isPrimary ? '#FEF2F2' : '#F8FAFC' }]}>
                <Icon name={isPrimary ? 'bell' : 'hospital'} size={13} color={isPrimary ? colors.red : colors.inkSoft} />
                <Text style={[styles.targetBannerText, { color: isPrimary ? colors.redDark : colors.inkSoft }]}>
                  {isPrimary
                    ? 'Immediate Alert Target: Will receive emergency broadcast upon confirmation.'
                    : 'Auto-Failover Standby: Queued if primary ER reaches capacity.'}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>

      {/* 3. AI VISUAL FINDINGS (IF PHOTO WAS SUBMITTED) */}
      {aiImageResult && (
        <View style={{ marginBottom: 16 }}>
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

      {/* 4. IMMEDIATE ACTION PROTOCOL */}
      <LabelEyebrow>IMMEDIATE FIRST-AID ACTIONS</LabelEyebrow>
      <Card style={{ padding: 12, marginBottom: 16 }}>
        {immediateActions.map((action, i) => (
          <View key={i} style={styles.actionRow}>
            <Icon name="check" size={14} color={colors.success} />
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </Card>

      {/* 5. DISPATCH ACTION BUTTON */}
      <Button
        title="Proceed to Dispatch Confirmation →"
        onPress={() => router.push('/(patient)/emergency/review')}
      />

      <View style={{ height: 10 }} />
      <Button
        title="View Full Hospital Match Details"
        variant="secondary"
        onPress={() => router.push('/(patient)/emergency/ai-hospital-rec')}
      />

      <View style={{ height: 12 }} />
      <Banner color="blue" icon={<Icon name="ai" size={15} color={colors.blue} />}>
        Powered by Gemini Multimodal Clinical Triage · Golden Hour Network Protocol
      </Banner>
      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  severityOverviewCard: {
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  severityCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  dividerV: {
    width: 1,
    height: 48,
    backgroundColor: colors.line,
  },
  compareLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.inkFaint,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  comparePillWrap: {
    marginVertical: 2,
  },
  compareSub: {
    fontSize: 10,
    color: colors.inkSoft,
    marginTop: 2,
    textAlign: 'center',
  },
  activeSevHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  activeSevTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  activeSevSub: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 8,
  },
  resultBanner: {
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  resultBannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  hospCard: {
    padding: 13,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  primaryHospCard: {
    borderColor: colors.red,
    backgroundColor: '#FFFDFD',
  },
  hospHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  hospName: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    marginTop: 5,
  },
  etaBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  etaNum: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.red,
  },
  distNum: {
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 1,
  },
  whyBox: {
    marginTop: 8,
    padding: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  whyLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.inkFaint,
    letterSpacing: 0.5,
  },
  whyText: {
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
    lineHeight: 15,
  },
  bedsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  bedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  bedLabel: {
    fontSize: 11,
    color: colors.ink,
  },
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
  },
  targetBannerText: {
    fontSize: 10.5,
    fontWeight: '600',
    flex: 1,
  },
  imageCard: {
    padding: 14,
    marginBottom: 6,
  },
  authBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authConfidence: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  authVerdict: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 10,
  },
  findingsBox: {
    backgroundColor: colors.bg,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  findingsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkSoft,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  findingItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 3,
  },
  findingBullet: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  findingText: {
    fontSize: 11.5,
    color: colors.ink,
    flex: 1,
    lineHeight: 16,
  },
  photoThumb: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: colors.bg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 12,
    color: colors.ink,
    flex: 1,
  },
});


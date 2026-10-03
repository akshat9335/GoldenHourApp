import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, HTitle } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function AiAnalyzing() {
  const selectedType = useAppStore((s) => s.selectedType);
  const description = useAppStore((s) => s.description);
  const accidentPhotoUri = useAppStore((s) => s.accidentPhotoUri);
  const accidentPhotoBase64 = useAppStore((s) => s.accidentPhotoBase64);
  const setAiSeverity = useAppStore((s) => s.setAiSeverity);
  const setAiAssessedSeverity = useAppStore((s) => s.setAiAssessedSeverity);
  const setAiTriageResult = useAppStore((s) => s.setAiTriageResult);
  const setAiImageResult = useAppStore((s) => s.setAiImageResult);
  const setCandidateHospitals = useAppStore((s) => s.setCandidateHospitals);

  useEffect(() => {
    let mounted = true;

    const performAnalysis = async () => {
      try {
        const store = useAppStore.getState();
        const userEstimatedSeverity = store.userEstimatedSeverity || 'Moderate';
        const lastKnownLocation = store.lastKnownLocation;
        const lat = lastKnownLocation?.latitude || 25.4538;
        const lng = lastKnownLocation?.longitude || 81.854;

        const symptoms = description
          ? description.split(/[,.]+/).map((s) => s.trim()).filter(Boolean)
          : [selectedType || 'Trauma Emergency', 'Acute emergency assistance needed'];

        const triagePromise = api.ai.triage({
          symptoms: symptoms.length > 0 ? symptoms : ['Severe trauma injury'],
          consciousness: 'Conscious',
          imageBase64: accidentPhotoBase64 || undefined,
          imageMimeType: 'image/jpeg',
        } as any).catch((err) => {
          console.warn('[AI triage] fallback:', err);
          return null;
        });

        const imagePromise = accidentPhotoBase64
          ? api.ai.imageAnalysis({
              imageBase64: accidentPhotoBase64,
              mimeType: 'image/jpeg',
              context: `${selectedType || 'Emergency'}: ${description || 'Trauma incident'}`,
            }).catch((err) => {
              console.warn('[AI imageAnalysis] fallback:', err);
              return null;
            })
          : Promise.resolve(null);

        const hospPromise = api.hospitals.matchCandidates({
          latitude: lat,
          longitude: lng,
          requiredCapabilities: ['EMERGENCY_ROOM', 'TRAUMA_BAY'],
          specialtyNeeded: selectedType || 'GENERAL',
          severity: userEstimatedSeverity === 'Severe' ? 'HIGH' : 'MEDIUM',
        }).catch((err) => {
          console.warn('[AI hospital matching] fallback:', err);
          return null;
        });

        const [triageRes, imgRes, hospRes]: any = await Promise.all([
          triagePromise,
          imagePromise,
          hospPromise,
        ]);

        if (mounted) {
          if (imgRes) {
            setAiImageResult(imgRes);
          }

          if (hospRes?.candidates && Array.isArray(hospRes.candidates)) {
            setCandidateHospitals(hospRes.candidates);
          }

          let aiAssessed = 'HIGH';
          if (imgRes && triageRes) {
            aiAssessed =
              imgRes.severity === 'CRITICAL' || triageRes.severity === 'CRITICAL'
                ? 'CRITICAL'
                : imgRes.severity === 'HIGH' || triageRes.severity === 'HIGH'
                ? 'HIGH'
                : triageRes.severity || 'MEDIUM';
          } else if (imgRes) {
            aiAssessed = String(imgRes.severity || 'HIGH').toUpperCase();
          } else if (triageRes) {
            aiAssessed = String(triageRes.severity || 'HIGH').toUpperCase();
          }

          setAiAssessedSeverity(aiAssessed);

          if (triageRes) {
            setAiTriageResult({
              ...triageRes,
              imageAnalysis: imgRes || null,
            });
          } else if (imgRes) {
            setAiTriageResult({
              severity: imgRes.severity || 'HIGH',
              emergencyType: selectedType || 'Trauma Emergency',
              immediateActions: imgRes.immediateActions || [],
              avoidActions: [],
              explanation: imgRes.explanation || 'Visual analysis completed from uploaded incident image.',
              imageAnalysis: imgRes,
            });
          }

          // Clinical synthesis: Respect user estimation & AI findings (take safer higher severity)
          const sevRank: Record<string, number> = {
            mild: 1,
            low: 1,
            moderate: 2,
            medium: 2,
            high: 3,
            severe: 3,
            critical: 4,
          };
          const uRank = sevRank[userEstimatedSeverity.toLowerCase()] || 2;
          const aRank = sevRank[aiAssessed.toLowerCase()] || 2;
          const maxRank = Math.max(uRank, aRank);
          const rankMap: Record<number, 'low' | 'medium' | 'high' | 'critical'> = {
            1: 'low',
            2: 'medium',
            3: 'high',
            4: 'critical',
          };
          setAiSeverity(rankMap[maxRank] || 'high');
        }
      } catch (_err) {
        if (mounted) {
          setAiSeverity('high');
        }
      } finally {
        if (mounted) {
          router.replace('/(patient)/emergency/ai-result');
        }
      }
    };

    performAnalysis();

    return () => {
      mounted = false;
    };
  }, [accidentPhotoBase64, description, selectedType, setAiImageResult, setAiSeverity, setAiTriageResult]);

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.red} style={{ marginBottom: 20 }} />
      <HTitle size={16}>Analyzing symptoms…</HTitle>
      <Text style={styles.sub}>Cross-referencing vitals, symptoms and history</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkFaint, fontSize: 11.5, marginTop: 8, textAlign: 'center' },
});

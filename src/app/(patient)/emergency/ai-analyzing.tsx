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
  const setAiTriageResult = useAppStore((s) => s.setAiTriageResult);
  const setAiImageResult = useAppStore((s) => s.setAiImageResult);

  useEffect(() => {
    let mounted = true;

    const performAnalysis = async () => {
      try {
        const symptoms = description
          ? description.split(/[,.]+/).map((s) => s.trim()).filter(Boolean)
          : [selectedType || 'Trauma Emergency', 'Acute emergency assistance needed'];

        const triagePromise = api.ai.triage({
          symptoms: symptoms.length > 0 ? symptoms : ['Severe trauma injury'],
          consciousness: 'Conscious',
        }).catch((err) => {
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

        const [triageRes, imgRes]: any = await Promise.all([triagePromise, imagePromise]);

        if (mounted) {
          if (imgRes) {
            setAiImageResult(imgRes);
          }

          if (triageRes) {
            const combined = {
              ...triageRes,
              imageAnalysis: imgRes || null,
            };
            setAiTriageResult(combined);

            // Prioritize higher severity if image analysis detected critical findings
            let resolvedSev = triageRes.severity ? String(triageRes.severity).toLowerCase() : 'medium';
            if (imgRes?.severity) {
              const imgSev = String(imgRes.severity).toLowerCase();
              if (imgSev === 'critical' || (imgSev === 'high' && resolvedSev === 'low')) {
                resolvedSev = imgSev;
              }
            }

            if (['low', 'medium', 'high', 'critical'].includes(resolvedSev)) {
              setAiSeverity(resolvedSev as any);
            }
          } else if (imgRes) {
            // If text triage failed but image succeeded
            setAiTriageResult({
              severity: imgRes.severity || 'HIGH',
              emergencyType: selectedType || 'Trauma Emergency',
              immediateActions: imgRes.immediateActions || [],
              avoidActions: [],
              explanation: imgRes.explanation || 'Visual analysis completed from uploaded incident image.',
              imageAnalysis: imgRes,
            });
            const imgSev = String(imgRes.severity || 'high').toLowerCase();
            if (['low', 'medium', 'high', 'critical'].includes(imgSev)) {
              setAiSeverity(imgSev as any);
            }
          }
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

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/theme';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { triggerCanonicalEmergencySOS } from '@/services/emergency';
import { router } from 'expo-router';

interface VoiceAiEmergencyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function VoiceAiEmergencyModal({ visible, onClose }: VoiceAiEmergencyModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as 'en' | 'hi' | 'mr';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const activeRecognizerRef = useRef<any>(null);

  // Pulse animation for active microphone
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isListening) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isListening]);

  // Cleanly start/stop speech recognizer when modal opens or closes
  useEffect(() => {
    if (visible) {
      // Auto-start listening only when opened via button
      startListening();
    } else {
      stopListening();
      setTranscript('');
      setTriageResult(null);
      setIsAnalyzing(false);
    }
    return () => {
      stopListening();
    };
  }, [visible]);

  const startListening = () => {
    setIsListening(true);
    setTriageResult(null);

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          if (activeRecognizerRef.current) {
            try { activeRecognizerRef.current.abort(); } catch {}
          }
          const recognizer = new SpeechRecognition();
          recognizer.continuous = false;
          recognizer.interimResults = true;
          recognizer.lang = currentLang === 'mr' ? 'mr-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';

          recognizer.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript;
            }
            setTranscript(fullText);
          };

          recognizer.onerror = () => {
            setIsListening(false);
          };

          recognizer.onend = () => {
            setIsListening(false);
          };

          recognizer.start();
          activeRecognizerRef.current = recognizer;
          return;
        } catch {
          // Native or unsupported
        }
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (activeRecognizerRef.current) {
      try {
        activeRecognizerRef.current.stop();
      } catch {}
      activeRecognizerRef.current = null;
    }
  };

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : transcript).trim();
    stopListening();
    setIsAnalyzing(true);
    setTriageResult(null);

    try {
      const location = useAppStore.getState().lastKnownLocation;
      const res = await api.ai.voiceTriage({
        transcript: text,
        language: currentLang,
        location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
      });

      if (res) {
        setTriageResult(res);
      }
    } catch {
      // Offline fallback heuristic
      setTriageResult({
        severity: 'HIGH',
        emergencyType: 'Emergency Voice Report',
        recommendedAmbulance: 'ALS',
        detectedSymptoms: [text || 'Voice SOS Activated'],
        firstAidSteps: [
          currentLang === 'mr'
            ? 'शांत राहा आणि अ‍ॅम्ब्युलन्स येईपर्यंत रुग्णाला सुरक्षित ठेवा.'
            : currentLang === 'hi'
            ? 'शांत रहें और एम्बुलेंस आने तक मरीज़ को सुरक्षित स्थान पर रखें।'
            : 'Keep the patient still and calm while emergency teams dispatch.',
        ],
        summary: 'Emergency services alerted.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulatePhrase = (phrase: string) => {
    setTranscript(phrase);
    handleAnalyze(phrase);
  };

  const handleConfirmDispatch = async () => {
    setIsDispatching(true);
    try {
      const loc = useAppStore.getState().lastKnownLocation || { latitude: 25.4358, longitude: 81.8463 };
      const emergencyId = await triggerCanonicalEmergencySOS({
        location: { latitude: loc.latitude, longitude: loc.longitude },
        incidentType: triageResult?.emergencyType || 'ACCIDENT',
        description: `VOICE SOS: "${transcript || triageResult?.emergencyType}" [AI Triage: ${triageResult?.recommendedAmbulance || 'ALS'}]`,
        voiceTranscript: transcript || undefined,
      });

      onClose();
      if (emergencyId) {
        router.push(`/(patient)/emergency/tracking?emergencyId=${emergencyId}` as any);
      } else {
        router.push('/(patient)/home');
      }
    } catch (err: any) {
      Alert.alert('Dispatch Error', err?.message || 'Could not dispatch ambulance. Please call 108/112 directly.');
    } finally {
      setIsDispatching(false);
    }
  };

  const testPhrases = {
    en: [
      'Severe chest pain, cannot breathe!',
      'Road accident, bleeding heavily!',
      'Dog bite on leg, need rabies shot',
    ],
    hi: [
      'सीने में बहुत तेज दर्द है, सांस फूल रही है!',
      'सड़क पर भीषण एक्सीडेंट हुआ है, खून बह रहा है!',
      'कुत्ते ने काट लिया है, तुरंत मदद चाहिए!',
    ],
    mr: [
      'छातीत खूप कळ येतेय आणि श्वास घेता येत नाहीये!',
      'मोठा अपघात झाला आहे, डोक्याला मार लागलाय!',
      'पायाला कुत्रा चावला आहे, इंजेक्शन हवे आहे!',
    ],
  };

  const activePresets = testPhrases[currentLang] || testPhrases.en;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🎙️ Voice SOS & AI Triage</Text>
              <Text style={styles.subtitle}>
                {currentLang === 'mr'
                  ? 'बोलण्यासाठी माईक चालू करा किंवा तात्काळ शब्द निवडा'
                  : currentLang === 'hi'
                  ? 'बोलने के लिए माइक ऑन करें या त्वरित शब्द चुनें'
                  : 'Button-triggered voice recognition with AI triage'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Mic Button & Status */}
            <View style={styles.micSection}>
              <Animated.View
                style={[
                  styles.micRing,
                  isListening && {
                    borderColor: colors.red,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.micBtn, isListening && styles.micBtnActive]}
                  onPress={isListening ? stopListening : startListening}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 32 }}>{isListening ? '🛑' : '🎙️'}</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={[styles.statusText, isListening ? styles.statusActive : styles.statusIdle]}>
                {isListening
                  ? t('voiceSos.listening', 'Listening… Speak your symptoms')
                  : t('voiceSos.tapToSpeak', 'Tap Mic to Speak (Voice OFF)')}
              </Text>

              {/* Explicit Turn On / Turn Off Button */}
              <TouchableOpacity
                style={[styles.toggleListeningBtn, isListening ? styles.toggleBtnRed : styles.toggleBtnGreen]}
                onPress={isListening ? stopListening : startListening}
              >
                <Text style={styles.toggleBtnText}>
                  {isListening ? `⏹️ ${t('voiceSos.turnOff', 'Stop Voice (Turn OFF)')}` : `▶️ ${t('voiceSos.turnOn', 'Turn Voice ON')}`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Spoken Transcript Input & Analyze Action */}
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Spoken Transcript / लक्षण:</Text>
              <Text style={styles.transcriptContent}>
                {transcript ? `"${transcript}"` : '(Speak or tap a quick phrase below…)'}
              </Text>
              {transcript.length > 0 && !triageResult && (
                <TouchableOpacity
                  style={styles.analyzeBtn}
                  onPress={() => handleAnalyze()}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.analyzeBtnText}>⚡ Run AI Clinical Triage</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Simulation Presets for Testing */}
            <View style={styles.presetSection}>
              <Text style={styles.presetLabel}>Quick Presets (Instant Simulation):</Text>
              <View style={styles.presetRow}>
                {activePresets.map((phrase, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetChip}
                    onPress={() => handleSimulatePhrase(phrase)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>{phrase}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* AI Analysis Result Card */}
            {isAnalyzing && (
              <View style={styles.analyzingCard}>
                <ActivityIndicator size="large" color={colors.red} />
                <Text style={styles.analyzingText}>
                  {t('voiceSos.analyzing', 'AI Clinical Analysis in progress…')}
                </Text>
              </View>
            )}

            {triageResult && !isAnalyzing && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      triageResult.severity === 'CRITICAL'
                        ? styles.sevCritical
                        : triageResult.severity === 'HIGH'
                        ? styles.sevHigh
                        : styles.sevMedium,
                    ]}
                  >
                    <Text style={styles.severityText}>
                      {triageResult.severity || 'EMERGENCY'}
                    </Text>
                  </View>
                  <Text style={styles.ambulanceBadge}>
                    🚑 {triageResult.recommendedAmbulance || 'ALS'} Ambulance
                  </Text>
                </View>

                <Text style={styles.emergencyType}>{triageResult.emergencyType}</Text>
                <Text style={styles.summaryText}>{triageResult.summary}</Text>

                {triageResult.firstAidSteps?.length > 0 && (
                  <View style={styles.firstAidBox}>
                    <Text style={styles.firstAidHeading}>
                      🩺 {t('voiceSos.firstAidGuidance', 'Immediate First Aid Advice')}:
                    </Text>
                    {triageResult.firstAidSteps.map((step: string, sIdx: number) => (
                      <Text key={sIdx} style={styles.firstAidStep}>
                        • {step}
                      </Text>
                    ))}
                  </View>
                )}

                {/* 1-Tap SOS Dispatch Confirmation */}
                <TouchableOpacity
                  style={styles.dispatchBtn}
                  onPress={handleConfirmDispatch}
                  disabled={isDispatching}
                  activeOpacity={0.85}
                >
                  {isDispatching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.dispatchBtnText}>
                      🚨 {t('voiceSos.dispatchNow', 'Dispatch Ambulance (SOS)')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  micSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  micRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: colors.redGlow,
  },
  statusText: {
    marginTop: 10,
    fontSize: 12.5,
    fontWeight: '700',
  },
  statusActive: {
    color: colors.red,
  },
  statusIdle: {
    color: colors.inkFaint,
  },
  toggleListeningBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleBtnRed: {
    backgroundColor: '#FEE2E2',
  },
  toggleBtnGreen: {
    backgroundColor: '#DCFCE7',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
  transcriptBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginVertical: 10,
  },
  transcriptLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  transcriptContent: {
    fontSize: 13,
    color: colors.ink,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  analyzeBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  analyzeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  presetSection: {
    marginVertical: 8,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  analyzingCard: {
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  analyzingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  resultCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevCritical: {
    backgroundColor: colors.red,
  },
  sevHigh: {
    backgroundColor: '#EA580C',
  },
  sevMedium: {
    backgroundColor: '#D97706',
  },
  severityText: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ambulanceBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 11.5,
    color: colors.inkSoft,
    lineHeight: 16,
    marginBottom: 10,
  },
  firstAidBox: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  firstAidHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  firstAidStep: {
    fontSize: 11,
    color: colors.ink,
    lineHeight: 16,
    marginBottom: 2,
  },
  dispatchBtn: {
    backgroundColor: colors.red,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

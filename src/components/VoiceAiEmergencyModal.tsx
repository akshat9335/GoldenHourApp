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
  Platform,
  PermissionsAndroid,
  TextInput,
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
  const inputRef = useRef<TextInput | null>(null);
  const activeRecognizerRef = useRef<any>(null);
  const nativeSimTimerRef = useRef<any>(null);
  const scenarioIndexRef = useRef<number>(0);

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

  // Cleanly reset speech recognizer when modal opens or closes
  useEffect(() => {
    stopListening();
    setTranscript('');
    setTriageResult(null);
    setIsAnalyzing(false);
    return () => {
      stopListening();
    };
  }, [visible]);

  const handleTranscriptChange = (text: string) => {
    // If user is typing or dictating via Gboard, cancel any background simulation timer immediately
    if (nativeSimTimerRef.current) {
      clearTimeout(nativeSimTimerRef.current);
      nativeSimTimerRef.current = null;
    }
    setIsListening(false);
    setTranscript(text);
  };

  const startListening = async () => {
    setIsListening(true);
    setTriageResult(null);

    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Golden Hour needs access to your microphone for Voice SOS and Emergency Triage.',
            buttonPositive: 'Grant Permission',
            buttonNegative: 'Cancel',
          }
        );
      } catch (e) {
        console.warn('Microphone permission request error:', e);
      }
    }

    let startedWeb = false;
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
          startedWeb = true;
        } catch {
          startedWeb = false;
        }
      }
    }

    // On Native Android: focus the input directly so user can dictate using their phone keyboard mic
    if (!startedWeb) {
      setIsListening(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (nativeSimTimerRef.current) {
      clearTimeout(nativeSimTimerRef.current);
      nativeSimTimerRef.current = null;
    }
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
      // Offline fallback heuristic with intelligent differentiation
      const lower = text.toLowerCase();
      const isCritical = /(chest pain|heart attack|difficulty breathing|shortness of breath|cardiac|chhaati|seene me dard|saans|सीने में दर्द|दिल का दौरा|सांस|accident|fracture|head injury|bleeding|unconscious|stroke|khoon|chot|खून|एक्सीडेंट|बेहोश|dog bite|snake bite|kutta|saanp)/i.test(lower);
      const isOpd = /(fever|cough|cold|headache|stomach|pet dard|vomit|diarrhea|dast|loose motion|rash|allergy|weakness|doctor|appointment|consult|bukhar|khasi|jukham|sar dard|बुखार|खांसी|जुकाम|सिर दर्द|पेट दर्द)/i.test(lower);
      const isVague = !text || text.length < 3 || /^(hi|hello|hey|namaste|kya haal|help|check|test|batao|sir|bhai)$/i.test(lower.trim());

      if (isCritical) {
        setTriageResult({
          severity: 'HIGH',
          emergencyType: 'Acute Emergency Detected',
          recommendedAmbulance: 'ALS',
          isEmergency: true,
          suggestedAction: 'DISPATCH_AMBULANCE',
          detectedSymptoms: [text || 'Critical Emergency'],
          firstAidSteps: [
            currentLang === 'hi'
              ? 'शांत रहें और एम्बुलेंस आने तक मरीज़ को सुरक्षित स्थान पर रखें।'
              : 'Keep the patient still and calm while emergency teams dispatch.',
          ],
          summary: currentLang === 'hi' ? 'गंभीर आपातकाल: तत्काल एम्बुलेंस डिस्पैच अनुशंसित।' : 'High priority emergency. Paramedic ambulance dispatch recommended.',
        });
      } else if (isOpd) {
        setTriageResult({
          severity: 'LOW',
          emergencyType: 'Non-Emergency · General OPD Symptom',
          recommendedAmbulance: 'NONE',
          isEmergency: false,
          suggestedAction: 'CONSULT_DOCTOR',
          detectedSymptoms: [text || 'General Symptom'],
          firstAidSteps: [
            currentLang === 'hi'
              ? 'पर्याप्त पानी पिएं, आराम करें और नज़दीकी डॉक्टर से परामर्श लें।'
              : 'Stay hydrated, rest, and consult an OPD doctor or teleconsult.',
          ],
          summary: currentLang === 'hi' ? 'सामान्य स्वास्थ्य लक्षण। एम्बुलेंस की आवश्यकता नहीं है; डॉक्टर से परामर्श लें।' : 'Non-emergency condition detected. Ambulance not required. OPD doctor consultation recommended.',
        });
      } else {
        setTriageResult({
          severity: 'LOW',
          emergencyType: isVague ? 'Symptom Clarification Required' : 'General Health Inquiry',
          recommendedAmbulance: 'NONE',
          isEmergency: false,
          suggestedAction: isVague ? 'CLARIFY_INPUT' : 'CONSULT_DOCTOR',
          detectedSymptoms: [text || 'General query'],
          firstAidSteps: [
            currentLang === 'hi'
              ? 'कृपया लक्षण स्पष्ट बताएं (जैसे सीने में दर्द, सांस की तकलीफ, सड़क दुर्घटना, या बुखार)।'
              : 'Please describe specific symptoms to receive tailored medical guidance.',
          ],
          summary: currentLang === 'hi' ? 'एम्बुलेंस की आवश्यकता नहीं है। परामर्श के लिए डॉक्टर से संपर्क करें।' : 'No acute emergency detected. You can consult an OPD doctor or start teleconsultation.',
        });
      }
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
      'Mild fever and cough for 2 days',
    ],
    hi: [
      'सीने में बहुत तेज दर्द है, सांस फूल रही है!',
      'सड़क पर भीषण एक्सीडेंट हुआ है, खून बह रहा है!',
      'दो दिन से हल्का बुखार और खांसी है',
    ],
    mr: [
      'छातीत खूप कळ येतेय आणि श्वास घेता येत नाहीये!',
      'मोठा अपघात झाला आहे, डोक्याला मार लागलाय!',
      'दोन दिवसांपासून ताप आणि खोकला आहे',
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.transcriptLabel}>Spoken Transcript / लक्षण:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {transcript.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setTranscript('');
                        setTriageResult(null);
                        stopListening();
                      }}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 11, color: colors.red, fontWeight: '700' }}>✕ Clear</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={{ fontSize: 10, color: colors.inkFaint }}>Tap to speak via mic 🎙️</Text>
                </View>
              </View>
              <TextInput
                ref={inputRef}
                style={styles.transcriptInput}
                value={transcript}
                onChangeText={handleTranscriptChange}
                onFocus={() => {
                  stopListening();
                }}
                placeholder={isListening ? '🎙️ Listening to voice… speak now' : '🎙️ Tap to speak using keyboard mic, or type emergency symptoms here...'}
                placeholderTextColor={isListening ? colors.red : colors.inkFaint}
                multiline
              />
              {transcript.trim().length > 0 && !triageResult && (
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

            {triageResult && !isAnalyzing && (() => {
              const isEmergencyCase = Boolean(
                triageResult.isEmergency === true ||
                  triageResult.suggestedAction === 'DISPATCH_AMBULANCE' ||
                  triageResult.severity === 'CRITICAL' ||
                  (triageResult.severity === 'HIGH' && triageResult.recommendedAmbulance !== 'NONE')
              );
              const isClarifyCase = Boolean(triageResult.suggestedAction === 'CLARIFY_INPUT');

              return (
                <View
                  style={[
                    styles.resultCard,
                    isClarifyCase
                      ? styles.resultCardClarify
                      : !isEmergencyCase
                      ? styles.resultCardNonEmergency
                      : null,
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <View
                      style={[
                        styles.severityBadge,
                        isClarifyCase
                          ? styles.sevInfo
                          : triageResult.severity === 'CRITICAL'
                          ? styles.sevCritical
                          : triageResult.severity === 'HIGH'
                          ? styles.sevHigh
                          : isEmergencyCase
                          ? styles.sevMedium
                          : styles.sevLow,
                      ]}
                    >
                      <Text style={styles.severityText}>
                        {isClarifyCase
                          ? 'INPUT REQUIRED'
                          : isEmergencyCase
                          ? (triageResult.severity || 'EMERGENCY')
                          : 'NON-EMERGENCY'}
                      </Text>
                    </View>
                    {isClarifyCase ? (
                      <Text style={[styles.ambulanceBadge, { color: '#1E40AF' }]}>
                        📋 Describe Symptoms
                      </Text>
                    ) : isEmergencyCase ? (
                      <Text style={styles.ambulanceBadge}>
                        🚑 {triageResult.recommendedAmbulance || 'ALS'} Ambulance
                      </Text>
                    ) : (
                      <Text style={[styles.ambulanceBadge, { color: '#166534' }]}>
                        👨‍⚕️ Doctor Consult (OPD)
                      </Text>
                    )}
                  </View>

                  <Text style={styles.emergencyType}>{triageResult.emergencyType}</Text>
                  <Text style={styles.summaryText}>{triageResult.summary}</Text>

                  {triageResult.firstAidSteps?.length > 0 && (
                    <View
                      style={[
                        styles.firstAidBox,
                        !isEmergencyCase && { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
                        isClarifyCase && { borderColor: '#FDE68A', backgroundColor: '#FEF3C7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.firstAidHeading,
                          !isEmergencyCase && { color: '#166534' },
                          isClarifyCase && { color: '#92400E' },
                        ]}
                      >
                        🩺 {isEmergencyCase ? t('voiceSos.firstAidGuidance', 'Immediate First Aid Advice') : isClarifyCase ? 'Guidance' : 'Recommended Care'}:
                      </Text>
                      {triageResult.firstAidSteps.map((step: string, sIdx: number) => (
                        <Text key={sIdx} style={styles.firstAidStep}>
                          • {step}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Actions Differentiated by Triage Category */}
                  {isClarifyCase ? (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 }}>
                        TAP A SYMPTOM BELOW OR TYPE/SPEAK:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {[
                          { label: '💔 Chest Pain', phrase: 'Severe chest pain, cannot breathe' },
                          { label: '🚗 Road Accident', phrase: 'Road accident, bleeding heavily' },
                          { label: '🌡️ High Fever', phrase: 'High fever and severe body pain' },
                          { label: '🐕 Dog Bite', phrase: 'Dog bite on leg, need rabies shot' },
                          { label: '🫁 Breathing Issue', phrase: 'Difficulty breathing and wheezing' },
                        ].map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.presetChip}
                            onPress={() => handleSimulatePhrase(item.phrase)}
                          >
                            <Text style={styles.presetChipText}>{item.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : isEmergencyCase ? (
                    /* 1-Tap SOS Dispatch for Real Emergencies */
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
                  ) : (
                    /* Non-Emergency: Doctor Consultation Pathway */
                    <View style={{ marginTop: 8, gap: 10 }}>
                      <TouchableOpacity
                        style={styles.consultDoctorBtn}
                        onPress={() => {
                          onClose();
                          router.push('/(patient)/consult-doctor');
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.consultDoctorBtnText}>
                          👨‍⚕️ {currentLang === 'hi' ? 'डॉक्टर से परामर्श लें (OPD / ऑनलाइन)' : currentLang === 'mr' ? 'डॉक्टरांचा सल्ला घ्या' : 'Consult Doctor (OPD / Online)'}
                        </Text>
                      </TouchableOpacity>

                      {/* Safety Failsafe */}
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Dispatch Emergency Ambulance?',
                            'General non-emergency symptoms were detected. If this is a life-threatening crisis, confirm to dispatch an ambulance.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Confirm Dispatch', style: 'destructive', onPress: handleConfirmDispatch },
                            ]
                          );
                        }}
                        style={{ paddingVertical: 6, alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 11.5, color: colors.red, fontWeight: '700' }}>
                          ⚠️ {currentLang === 'hi' ? 'फिर भी एम्बुलेंस (SOS) बुलाएं' : 'Dispatch Emergency SOS Anyway'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()}
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
  transcriptInput: {
    minHeight: 56,
    fontSize: 13.5,
    color: colors.ink,
    lineHeight: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    textAlignVertical: 'top',
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
  resultCardNonEmergency: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  resultCardClarify: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  sevLow: {
    backgroundColor: '#16A34A',
  },
  sevInfo: {
    backgroundColor: '#3B82F6',
  },
  consultDoctorBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultDoctorBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

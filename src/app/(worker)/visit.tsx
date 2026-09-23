import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { enqueueOfflineAction } from '@/services/offlineSync';

const PATIENTS_KEY = '@golden_hour_community_patients';
const VISITS_KEY = '@golden_hour_community_visits';

type ConsciousnessLevel = 'ALERT' | 'VOICE_RESPONSIVE' | 'PAIN_RESPONSIVE' | 'UNRESPONSIVE';
type TriageSeverity = 'NORMAL' | 'MODERATE' | 'CRITICAL';

function evaluateSeverity(params: {
  spo2: number;
  pulse: number;
  consciousness: ConsciousnessLevel;
  bleedingActive: boolean;
  fractureSuspected: boolean;
}): TriageSeverity {
  if (
    params.consciousness === 'UNRESPONSIVE' ||
    params.consciousness === 'PAIN_RESPONSIVE' ||
    params.spo2 < 90 ||
    params.pulse > 130 ||
    params.pulse < 45
  ) return 'CRITICAL';
  if (params.bleedingActive || params.fractureSuspected || params.consciousness === 'VOICE_RESPONSIVE')
    return 'MODERATE';
  return 'NORMAL';
}

const SEVERITY_CONFIG: Record<TriageSeverity, { color: string; hiLabel: string; enLabel: string }> = {
  CRITICAL: { color: '#DC2626', hiLabel: 'अति गंभीर (CRITICAL) — तत्काल अस्पताल रेफरल', enLabel: 'CRITICAL — Immediate Tertiary Transfer' },
  MODERATE: { color: '#EA580C', hiLabel: 'मध्यम (MODERATE) — जिला अस्पताल / PHC', enLabel: 'MODERATE — District Hospital / PHC' },
  NORMAL: { color: '#16A34A', hiLabel: 'सामान्य (NORMAL) — घर पर देखभाल', enLabel: 'NORMAL — Home Care & Monitor' },
};

export default function VisitScreen() {
  const { t, i18n } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const lang = i18n.language as 'en' | 'hi';

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');

  // Vitals
  const [pulse, setPulse] = useState('78');
  const [spo2, setSpo2] = useState('96');
  const [bp, setBp] = useState('120/80');
  const [temp, setTemp] = useState('98.6');
  const [bloodSugar, setBloodSugar] = useState('');
  const [consciousness, setConsciousness] = useState<ConsciousnessLevel>('ALERT');
  const [bleedingActive, setBleedingActive] = useState(false);
  const [fractureSuspected, setFractureSuspected] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  
  // Follow-up
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const severity = evaluateSeverity({
    spo2: parseInt(spo2 || '96', 10),
    pulse: parseInt(pulse || '78', 10),
    consciousness,
    bleedingActive,
    fractureSuspected,
  });

  useEffect(() => {
    AsyncStorage.getItem(PATIENTS_KEY).then((raw) => {
      if (raw) {
        const list = JSON.parse(raw);
        setPatients(list);
        if (!selectedPatientId && list.length > 0) {
          setSelectedPatientId(list[0].id);
        }
      }
    });
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleRecordVisit = async () => {
    if (!selectedPatientId) {
      Alert.alert(t('common.error'), 'Please select a patient first.');
      return;
    }
    setIsSaving(true);

    const visit = {
      id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      patientId: selectedPatientId,
      patientName: selectedPatient?.name || 'Unknown',
      workerUid: 'asha-worker-local',
      vitals: {
        bloodPressure: bp,
        bloodSugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
        spO2: parseInt(spo2, 10),
        temperature: parseFloat(temp),
        pulse: parseInt(pulse, 10),
      },
      symptoms: symptoms.trim(),
      aiTriageSeverity: severity,
      aiGuidanceInHindi: SEVERITY_CONFIG[severity].hiLabel,
      followUpRequired,
      followUpDate: followUpRequired ? followUpDate.trim() : undefined,
      visitDate: new Date().toISOString(),
      syncedFromOffline: false,
      createdAt: new Date().toISOString(),
    };

    try {
      // Persist visit locally
      const raw = await AsyncStorage.getItem(VISITS_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(VISITS_KEY, JSON.stringify([visit, ...existing]));

      // Update patient's lastVisitDate and followUpDate locally
      const updatedPatients = patients.map((p) => {
        if (p.id === selectedPatientId) {
          return {
            ...p,
            lastVisitDate: new Date().toISOString(),
            followUpRequired,
            followUpDate: followUpRequired ? followUpDate.trim() : p.followUpDate,
          };
        }
        return p;
      });
      await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(updatedPatients));

      // Try live sync, else enqueue
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        try {
          const res = await fetch('http://localhost:5000/api/worker/visits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visit),
          });
          if (!res.ok) throw new Error('Server error');
        } catch {
          await enqueueOfflineAction('/api/worker/visits', 'POST', visit);
        }
      } else {
        await enqueueOfflineAction('/api/worker/visits', 'POST', visit);
      }

      Alert.alert(t('asha.visitRecorded'), t('asha.visitSaved'), [
        {
          text: severity === 'CRITICAL' || severity === 'MODERATE' ? t('asha.createPHCReferral') : 'OK',
          onPress: () => {
            if (severity === 'CRITICAL' || severity === 'MODERATE') {
              router.replace({
                pathname: '/(worker)/referral',
                params: {
                  patientId: selectedPatientId,
                  priority: severity === 'CRITICAL' ? 'CRITICAL' : 'MODERATE',
                  reason: symptoms.trim() || `Triage assessment: ${severity}`,
                },
              });
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch {
      Alert.alert(t('common.error'), 'Could not save visit. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const CONSCIOUSNESS_OPTIONS: ConsciousnessLevel[] = ['ALERT', 'VOICE_RESPONSIVE', 'PAIN_RESPONSIVE', 'UNRESPONSIVE'];
  const consciousnessLabel: Record<ConsciousnessLevel, string> = {
    ALERT: t('asha.alert'),
    VOICE_RESPONSIVE: t('asha.voiceResponsive'),
    PAIN_RESPONSIVE: t('asha.painResponsive'),
    UNRESPONSIVE: t('asha.unresponsive'),
  };

  const cfg = SEVERITY_CONFIG[severity];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevL" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('asha.visitTitle')}</Text>
        <LanguageSelector />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Patient Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.selectPatient')}</Text>
          {patients.length === 0 ? (
            <Text style={styles.noPatients}>{t('asha.noPatients')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              <View style={styles.patientPillRow}>
                {patients.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.patientPill, selectedPatientId === p.id && styles.patientPillActive]}
                    onPress={() => setSelectedPatientId(p.id)}
                  >
                    <Text style={[styles.patientPillText, selectedPatientId === p.id && { color: '#fff' }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.patientPillSub, selectedPatientId === p.id && { color: '#fca5a5' }]}>
                      {p.villageOrArea}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Vitals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.vitalsTitle')}</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>{t('asha.pulseRate')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={pulse} onChangeText={setPulse} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>{t('asha.oxygenSpo2')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={spo2} onChangeText={setSpo2} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>{t('asha.bloodPressure')}</Text>
              <TextInput style={styles.input} placeholder="120/80" value={bp} onChangeText={setBp} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>{t('asha.temperature')}</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={temp} onChangeText={setTemp} />
            </View>
          </View>

          <Text style={styles.label}>{t('asha.bloodSugar')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 120"
            keyboardType="numeric"
            value={bloodSugar}
            onChangeText={setBloodSugar}
          />

          {/* Consciousness */}
          <Text style={styles.label}>{t('asha.consciousness')}</Text>
          <View style={styles.segRow}>
            {CONSCIOUSNESS_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.segBtn, consciousness === c && styles.segBtnActive]}
                onPress={() => setConsciousness(c)}
              >
                <Text style={[styles.segText, consciousness === c && styles.segTextActive]}>
                  {consciousnessLabel[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Checkboxes */}
          {[
            { label: t('asha.activeBleeding'), val: bleedingActive, set: setBleedingActive },
            { label: t('asha.suspectedFracture'), val: fractureSuspected, set: setFractureSuspected },
          ].map(({ label, val, set }) => (
            <TouchableOpacity
              key={label}
              style={styles.checkRow}
              onPress={() => set(!val)}
            >
              <Text style={[styles.checkIcon, val && { color: '#DC2626' }]}>{val ? '☑' : '☐'}</Text>
              <Text style={styles.checkLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Symptoms & Clinical Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.symptoms')}</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            placeholder={lang === 'hi' ? 'लक्षण यहाँ लिखें…' : 'Describe symptoms and observations here…'}
            value={symptoms}
            onChangeText={setSymptoms}
          />

          {/* Follow-up Required */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('asha.followUpRequired')}</Text>
            <Switch
              value={followUpRequired}
              onValueChange={setFollowUpRequired}
              trackColor={{ true: colors.red }}
              thumbColor={followUpRequired ? '#fff' : '#f4f3f4'}
            />
          </View>
          {followUpRequired && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>{t('asha.followUpDate')}</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
            </View>
          )}
        </View>

        {/* AI Triage Result */}
        <View style={[styles.card, { borderColor: cfg.color + '55', backgroundColor: cfg.color + '10' }]}>
          <Text style={styles.cardTitle}>{t('asha.triageAssessment')}</Text>
          <View style={[styles.triageBadge, { backgroundColor: cfg.color }]}>
            <Text style={styles.triageBadgeText}>
              {lang === 'hi' ? cfg.hiLabel : cfg.enLabel}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleRecordVisit}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isSaving ? 'Saving…' : `${t('asha.recordVisit')} — Works Offline ✓`}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 50 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: colors.inkSoft, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  segBtnActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  segText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  segTextActive: { color: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkIcon: { fontSize: 18, marginRight: 8, color: colors.inkFaint },
  checkLabel: { fontSize: 13.5, fontWeight: '500', color: colors.ink },
  noPatients: { color: colors.inkFaint, fontSize: 13, marginTop: 4 },
  patientPillRow: { flexDirection: 'row', gap: 8 },
  patientPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  patientPillActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  patientPillText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  patientPillSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 1 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  triageBadge: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  triageBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    elevation: 3,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

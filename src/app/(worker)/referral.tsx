import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { enqueueOfflineAction } from '@/services/offlineSync';
import { api, getApiBaseUrl } from '@/services/api';

const PATIENTS_KEY = '@golden_hour_community_patients';
const REFERRALS_KEY = '@golden_hour_community_referrals';

type ReferralPriority = 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';

const FACILITIES = [
  { name: 'Swaroop Rani Nehru Hospital (District Trauma)', type: 'District Hospital' },
  { name: 'Naini Primary Health Centre (PHC)', type: 'Primary Health Centre' },
  { name: 'Shankargarh Community Health Centre (CHC)', type: 'Community Health Centre' },
  { name: 'Kamla Nehru Memorial Hospital', type: 'Specialized Hospital' },
  { name: 'Tej Bahadur Sapru (Beli) Hospital', type: 'District Hospital' },
];

export default function CreateReferralScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { patientId: paramPatientId } = useLocalSearchParams<{ patientId?: string }>();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(paramPatientId || '');
  const [destinationFacility, setDestinationFacility] = useState(FACILITIES[0].name);
  const [priority, setPriority] = useState<ReferralPriority>('HIGH');
  const [reason, setReason] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const raw = await AsyncStorage.getItem(PATIENTS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        setPatients(list);
        if (!selectedPatientId && list.length > 0) {
          setSelectedPatientId(list[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      Alert.alert(t('common.error'), lang === 'mr' ? 'कृपया रुग्ण निवडा.' : lang === 'hi' ? 'कृपया रोगी चुनें।' : 'Please select a patient.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert(t('common.error'), lang === 'mr' ? 'कृपया रेफरलचे कारण लिहा.' : lang === 'hi' ? 'कृपया रेफरल का कारण दर्ज करें।' : 'Please enter referral reason / symptoms.');
      return;
    }

    setIsSubmitting(true);
    const referralCode = `REF-ASHA-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      id: `ref-${Date.now()}`,
      referralCode,
      patientId: selectedPatientId,
      patientName: selectedPatient?.name || 'Community Patient',
      patientAge: selectedPatient?.age || 0,
      patientGender: selectedPatient?.gender || 'FEMALE',
      workerUid: 'asha-worker-prayagraj',
      workerName: 'Sunita Verma (ASHA Sangini)',
      destinationFacility,
      priority,
      reason,
      vitalsSnapshot: {
        bloodPressure: bp || undefined,
        pulse: pulse ? Number(pulse) : undefined,
        spO2: spo2 ? Number(spo2) : undefined,
        bloodSugar: bloodSugar ? Number(bloodSugar) : undefined,
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save locally in AsyncStorage
      const raw = await AsyncStorage.getItem(REFERRALS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(payload);
      await AsyncStorage.setItem(REFERRALS_KEY, JSON.stringify(list));

      // 2. Enqueue in persistent offline queue
      await enqueueOfflineAction('/api/worker/referrals', 'POST', payload);

      // 3. If online, fire directly
      try {
        await api.worker.createReferral(payload);
      } catch {
        // Queue will auto-sync
      }

      Alert.alert(
        lang === 'mr' ? 'रेफरल यशस्वीरीत्या पाठवले ✓' : lang === 'hi' ? 'रेफरल सफलतापूर्वक प्रेषित ✓' : 'Referral Transmitted ✓',
        lang === 'mr'
          ? `रेफरल कोड: ${referralCode}\nरुग्णाला ${destinationFacility} येथे पाठवले आहे.`
          : lang === 'hi'
          ? `रेफरल कोड: ${referralCode}\nमरीज को ${destinationFacility} भेजा गया है।`
          : `Referral Code: ${referralCode}\nTransmitted to ${destinationFacility} (${priority} Priority).`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert(t('common.error'), 'Could not save referral.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PRIORITY_OPTIONS: Array<{ key: ReferralPriority; labelEn: string; labelHi: string; labelMr: string; color: string }> = [
    { key: 'CRITICAL', labelEn: 'CRITICAL (Immediate SOS)', labelHi: 'गंभीर (आपातकालीन SOS)', labelMr: 'गंभीर (तातडीची मदत/SOS)', color: '#DC2626' },
    { key: 'HIGH', labelEn: 'HIGH (Urgent PHC/Hospital)', labelHi: 'उच्च (तत्काल अस्पताल)', labelMr: 'उच्च (तातडीने रुग्णालय)', color: '#EA580C' },
    { key: 'MODERATE', labelEn: 'MODERATE (PHC Evaluation)', labelHi: 'मध्यम (PHC जाँच)', labelMr: 'मध्यम (PHC तपासणी)', color: '#2563EB' },
    { key: 'NORMAL', labelEn: 'NORMAL (Routine Transfer)', labelHi: 'सामान्य (नियमित जाँच)', labelMr: 'सामान्य (नियमित तपासणी)', color: '#16A34A' },
  ];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevL" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'hi' ? 'डिजिटल रेफरल' : 'Digital Frontline Referral'}</Text>
        <LanguageSelector />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Patient Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.selectPatient')} *</Text>
          {patients.length === 0 ? (
            <Text style={{ color: colors.inkFaint }}>{t('asha.noPatients')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pillRow}>
                {patients.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pill, selectedPatientId === p.id && styles.pillActive]}
                    onPress={() => setSelectedPatientId(p.id)}
                  >
                    <Text style={[styles.pillText, selectedPatientId === p.id && { color: '#fff' }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.pillSub, selectedPatientId === p.id && { color: '#FECACA' }]}>
                      {p.villageOrArea}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Priority Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {lang === 'mr' ? 'रेफरल प्राधान्य' : lang === 'hi' ? 'रेफरल प्राथमिकता' : 'Referral Priority'} *
          </Text>
          <View style={{ gap: 8 }}>
            {PRIORITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.priorityCard,
                  priority === opt.key && { borderColor: opt.color, backgroundColor: opt.color + '15' },
                ]}
                onPress={() => setPriority(opt.key)}
              >
                <View style={[styles.priorityDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.priorityCardText, priority === opt.key && { color: opt.color, fontWeight: '800' }]}>
                  {lang === 'mr' ? opt.labelMr : lang === 'hi' ? opt.labelHi : opt.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Destination Facility */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {lang === 'mr' ? 'गंतव्य रुग्णालय / PHC' : lang === 'hi' ? 'गंतव्य अस्पताल / PHC' : 'Destination Hospital / PHC'} *
          </Text>
          <View style={{ gap: 8 }}>
            {FACILITIES.map((f) => (
              <TouchableOpacity
                key={f.name}
                style={[
                  styles.facilityOption,
                  destinationFacility === f.name && styles.facilityOptionActive,
                ]}
                onPress={() => setDestinationFacility(f.name)}
              >
                <Icon name="hospital" size={16} color={destinationFacility === f.name ? '#0284C7' : colors.inkFaint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.facilityName, destinationFacility === f.name && { color: '#0369A1', fontWeight: '800' }]}>
                    {f.name}
                  </Text>
                  <Text style={styles.facilityType}>{f.type}</Text>
                </View>
                {destinationFacility === f.name && (
                  <Text style={{ color: '#0284C7', fontWeight: '800' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reason / Clinical Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {lang === 'mr' ? 'रेफरलचे कारण / लक्षणे' : lang === 'hi' ? 'रेफरल का कारण / लक्षण' : 'Reason for Referral / Symptoms'} *
          </Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            placeholder={
              lang === 'mr'
                ? 'कारण व लक्षणे सविस्तर लिहा…'
                : lang === 'hi'
                ? 'कारण एवं लक्षण विस्तार से लिखें…'
                : 'Enter clinical reason, symptoms, or emergency observations…'
            }
            value={reason}
            onChangeText={setReason}
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        {/* Attached Vitals Snapshot (Optional) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.vitalsTitle')} (Snapshot)</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>BP (e.g. 140/90)</Text>
              <TextInput style={styles.input} value={bp} onChangeText={setBp} placeholder="120/80" placeholderTextColor={colors.inkFaint} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Pulse (BPM)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={pulse} onChangeText={setPulse} placeholder="78" placeholderTextColor={colors.inkFaint} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>SpO₂ (%)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={spo2} onChangeText={setSpo2} placeholder="98" placeholderTextColor={colors.inkFaint} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Sugar (mg/dL)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={bloodSugar} onChangeText={setBloodSugar} placeholder="110" placeholderTextColor={colors.inkFaint} />
            </View>
          </View>
        </View>

        {/* Transmit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting
              ? 'Transmitting…'
              : lang === 'mr'
              ? 'डिजिटल रेफरल पाठवा (Works Offline ✓)'
              : lang === 'hi'
              ? 'डिजिटल रेफरल भेजें (Works Offline ✓)'
              : 'Transmit Digital Referral (Works Offline ✓)'}
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
  label: { fontSize: 11.5, fontWeight: '600', color: colors.inkSoft, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 10,
  },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pillActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  pillSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 1 },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityCardText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  facilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  facilityOptionActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  facilityName: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  facilityType: { fontSize: 11, color: colors.inkFaint, marginTop: 1 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  submitBtn: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    elevation: 3,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

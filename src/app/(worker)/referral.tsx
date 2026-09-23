import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
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
const REFERRALS_KEY = '@golden_hour_community_referrals';

type ReferralPriority = 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';

interface FacilityOption {
  id: string;
  name: string;
  type: 'PHC' | 'DISTRICT_HOSPITAL' | 'TERTIARY_HOSPITAL' | 'CLINIC';
  address: string;
}

const DEFAULT_FACILITIES: FacilityOption[] = [
  { id: 'hosp-phc-rampur', name: 'Rampur Primary Health Centre (PHC)', type: 'PHC', address: 'Rampur Sub-Center, Block 2' },
  { id: 'hosp-dist-civic', name: 'District Civil Hospital & Emergency', type: 'DISTRICT_HOSPITAL', address: 'Civil Lines, District HQ' },
  { id: 'hosp-apollo-cr', name: 'Apollo Emergency & Trauma Care Clinic', type: 'CLINIC', address: 'Plot 14, Sector 18, Connaught Place' },
  { id: 'hosp-max-south', name: 'Max Care Orthopedic & Trauma Center', type: 'TERTIARY_HOSPITAL', address: '22 Saket Institutional Area' },
];

export default function ReferralScreen() {
  const { t, i18n } = useTranslation();
  const { patientId, priority: initialPriority, reason: initialReason } = useLocalSearchParams<{
    patientId?: string;
    priority?: ReferralPriority;
    reason?: string;
  }>();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [selectedFacilityId, setSelectedFacilityId] = useState(DEFAULT_FACILITIES[0].id);
  const [priority, setPriority] = useState<ReferralPriority>(initialPriority || 'MODERATE');
  const [reason, setReason] = useState(initialReason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const selectedFacility = DEFAULT_FACILITIES.find((f) => f.id === selectedFacilityId);

  const handleSubmitReferral = async () => {
    if (!selectedPatientId) {
      Alert.alert(t('common.error'), 'Please select a patient.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert(t('common.error'), 'Please provide referral notes / clinical reason.');
      return;
    }

    setIsSubmitting(true);

    const referral = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      patientId: selectedPatientId,
      patientName: selectedPatient?.name || 'Community Patient',
      patientAge: selectedPatient?.age,
      patientGender: selectedPatient?.gender,
      villageOrArea: selectedPatient?.villageOrArea,
      workerUid: 'asha-worker-local',
      workerName: 'ASHA Worker',
      facilityId: selectedFacilityId,
      facilityName: selectedFacility?.name,
      reason: reason.trim(),
      priority,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    try {
      // Persist locally in referrals store
      const raw = await AsyncStorage.getItem(REFERRALS_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(REFERRALS_KEY, JSON.stringify([referral, ...existing]));

      // Sync live or enqueue for offline
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        try {
          const res = await fetch('http://localhost:5000/api/worker/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(referral),
          });
          if (!res.ok) throw new Error('Server error');
        } catch {
          await enqueueOfflineAction('/api/worker/referrals', 'POST', referral);
        }
      } else {
        await enqueueOfflineAction('/api/worker/referrals', 'POST', referral);
      }

      Alert.alert(t('asha.referralSent'), t('asha.referralSaved'), [
        { text: 'OK', onPress: () => router.replace('/(worker)/dashboard') },
      ]);
    } catch {
      Alert.alert(t('common.error'), 'Could not save referral. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PRIORITIES: ReferralPriority[] = ['NORMAL', 'MODERATE', 'HIGH', 'CRITICAL'];
  const PRIORITY_COLORS: Record<ReferralPriority, string> = {
    CRITICAL: '#DC2626',
    HIGH: '#EA580C',
    MODERATE: '#0284C7',
    NORMAL: '#16A34A',
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevL" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('asha.createPHCReferral')}</Text>
        <LanguageSelector />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Selection */}
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

        {/* Receiving Facility */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.selectFacility')}</Text>
          {DEFAULT_FACILITIES.map((facility) => {
            const isSelected = selectedFacilityId === facility.id;
            return (
              <TouchableOpacity
                key={facility.id}
                style={[styles.facilityCard, isSelected && styles.facilityCardActive]}
                onPress={() => setSelectedFacilityId(facility.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.facilityDot, isSelected && styles.facilityDotActive]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.facilityName, isSelected && { color: colors.ink }]}>{facility.name}</Text>
                  <Text style={styles.facilityAddress}>{facility.address}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Priority Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.referralPriority')}</Text>
          <View style={styles.segRow}>
            {PRIORITIES.map((p) => {
              const isSelected = priority === p;
              const color = PRIORITY_COLORS[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityBtn,
                    isSelected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, isSelected && { color: '#fff' }]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Referral Reason */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.referralReason')}</Text>
          <TextInput
            style={[styles.input, { height: 95, textAlignVertical: 'top' }]}
            multiline
            placeholder="Clinical observations, chief complaint, reasons for transfer…"
            value={reason}
            onChangeText={setReason}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmitReferral}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Submitting…' : `${t('asha.sendReferral')} — Works Offline ✓`}
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
  noPatients: { color: colors.inkFaint, fontSize: 13 },
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
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  facilityCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  facilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  facilityDotActive: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  facilityName: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  facilityAddress: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  segRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  priorityBtnText: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.ink,
  },
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { api, getApiBaseUrl } from '@/services/api';

const PATIENTS_KEY = '@golden_hour_community_patients';
const VISITS_KEY = '@golden_hour_community_visits';
const REFERRALS_KEY = '@golden_hour_community_referrals';

interface CommunityPatient {
  id: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  villageOrArea: string;
  bloodGroup?: string;
  isPregnant?: boolean;
  expectedDeliveryDate?: string;
  knownConditions?: string[];
  lastVisitDate?: string;
  crisisId: string;
  createdAt: string;
}

interface CommunityVisit {
  id: string;
  patientId: string;
  patientName: string;
  vitals: {
    bloodPressure?: string;
    bloodSugar?: number;
    spO2?: number;
    temperature?: number;
    pulse?: number;
  };
  symptoms: string;
  aiTriageSeverity?: 'NORMAL' | 'MODERATE' | 'CRITICAL';
  aiGuidanceInHindi?: string;
  visitDate: string;
}

interface CommunityReferral {
  id: string;
  referralCode: string;
  patientId: string;
  destinationFacility: string;
  priority: 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export default function PatientDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [patient, setPatient] = useState<CommunityPatient | null>(null);
  const [visits, setVisits] = useState<CommunityVisit[]>([]);
  const [referrals, setReferrals] = useState<CommunityReferral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      // 1. Try local cache
      const rawPatients = await AsyncStorage.getItem(PATIENTS_KEY);
      if (rawPatients) {
        const list: CommunityPatient[] = JSON.parse(rawPatients);
        const found = list.find((p) => p.id === patientId);
        if (found) setPatient(found);
      }

      const rawVisits = await AsyncStorage.getItem(VISITS_KEY);
      if (rawVisits) {
        const allVisits: CommunityVisit[] = JSON.parse(rawVisits);
        setVisits(allVisits.filter((v) => v.patientId === patientId));
      }

      const rawRefs = await AsyncStorage.getItem(REFERRALS_KEY);
      if (rawRefs) {
        const allRefs: CommunityReferral[] = JSON.parse(rawRefs);
        setReferrals(allRefs.filter((r) => r.patientId === patientId));
      }

      // 2. Fetch fresh from backend if reachable
      try {
        const data: any = await api.worker.getPatientDetail(patientId);
        if (data?.patient) {
          setPatient(data.patient);
          if (data.visits?.length) setVisits(data.visits);
          if (data.referrals?.length) setReferrals(data.referrals);
        }
      } catch {
        // Offline - use cached
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencySos = () => {
    Alert.alert(
      lang === 'hi' ? 'आपातकालीन एसओएस (SOS)' : 'Emergency SOS',
      lang === 'hi'
        ? `क्या आप ${patient?.name || 'रोगी'} के लिए आपातकालीन एम्बुलेंस और अस्पताल अलर्ट भेजना चाहते हैं?`
        : `Do you want to trigger emergency SOS dispatch for ${patient?.name || 'this patient'}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: lang === 'hi' ? 'एसओएस भेजें' : 'Trigger SOS',
          style: 'destructive',
          onPress: () => router.push('/(patient)/emergency/start' as any),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.red} />
        <Text style={{ marginTop: 12, color: colors.inkSoft }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
          {lang === 'hi' ? 'रोगी नहीं मिला' : 'Patient not found'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevL" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'hi' ? 'रोगी प्रोफ़ाइल' : 'Patient Profile'}</Text>
        <LanguageSelector />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{patient.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientMeta}>
                {patient.age}y • {patient.gender === 'MALE' ? '♂ Male' : patient.gender === 'FEMALE' ? '♀ Female' : '⚧ Other'} • {patient.villageOrArea}
              </Text>
              <View style={styles.crisisBadge}>
                <Text style={styles.crisisText}>ID: {patient.crisisId || patient.id}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{lang === 'hi' ? 'फ़ोन नंबर' : 'Phone'}</Text>
              {patient.phone ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}
                  onPress={() => Linking.openURL(`tel:${patient.phone.replace(/[^0-9+]/g, '')}`)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.gridVal, { color: colors.blue, fontWeight: '700', textDecorationLine: 'underline', marginTop: 0 }]}>
                    📞 {patient.phone}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.gridVal}>{lang === 'hi' ? 'फ़ोन नहीं है' : 'No Phone'}</Text>
              )}
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('asha.bloodGroup')}</Text>
              <Text style={styles.gridVal}>{patient.bloodGroup || 'Not Tested'}</Text>
            </View>
          </View>

          {/* Pregnancy & High Risk Badges */}
          <View style={styles.riskTagsRow}>
            {patient.isPregnant && (
              <View style={[styles.tagPill, { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }]}>
                <Text style={[styles.tagText, { color: '#C2410C' }]}>
                  🤰 {lang === 'mr' ? 'गर्भवती' : lang === 'hi' ? 'गर्भवती' : 'Pregnant'}{patient.expectedDeliveryDate ? ` (EDD: ${patient.expectedDeliveryDate})` : ''}
                </Text>
              </View>
            )}
            {patient.knownConditions?.map((c, i) => (
              <View key={i} style={[styles.tagPill, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Text style={[styles.tagText, { color: '#DC2626' }]}>⚠️ {c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0284C7' }]}
            onPress={() => router.push({ pathname: '/(worker)/visit' as any, params: { patientId: patient.id } })}
            activeOpacity={0.85}
          >
            <Icon name="profile" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>
              {lang === 'mr' ? 'गृह भेट / तपासणी' : lang === 'hi' ? 'गृह भ्रमण / जाँच' : 'Record Home Visit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#15803D' }]}
            onPress={() => router.push({ pathname: '/(worker)/referral' as any, params: { patientId: patient.id } })}
            activeOpacity={0.85}
          >
            <Icon name="hospital" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>
              {lang === 'mr' ? 'रुग्णालय रेफरल' : lang === 'hi' ? 'अस्पताल रेफरल' : 'Digital Referral'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency SOS button */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleEmergencySos}
          activeOpacity={0.85}
        >
          <Icon name="ambulance" size={20} color="#fff" />
          <Text style={styles.sosButtonText}>
            {t('asha.emergencySos')} — {lang === 'mr' ? 'तातडीने अ‍ॅम्ब्युलन्स बोलवा' : lang === 'hi' ? 'तुरंत एम्बुलेंस बुलाएं' : 'Immediate Ambulance SOS'}
          </Text>
        </TouchableOpacity>

        {/* Visit & Vital History Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'mr' ? 'मागील तपासण्या आणि विटल्स (History)' : lang === 'hi' ? 'पूर्व जाँच और विटल्स (History)' : 'Visit & Vital Signs History'}
          </Text>

          {visits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{lang === 'hi' ? 'कोई पूर्व जाँच दर्ज नहीं है।' : 'No past visits recorded yet.'}</Text>
            </View>
          ) : (
            visits.map((v) => (
              <View key={v.id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>
                    📅 {new Date(v.visitDate).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          v.aiTriageSeverity === 'CRITICAL'
                            ? '#DC2626'
                            : v.aiTriageSeverity === 'MODERATE'
                            ? '#D97706'
                            : '#15803D',
                      },
                    ]}
                  >
                    <Text style={styles.severityText}>{v.aiTriageSeverity || 'NORMAL'}</Text>
                  </View>
                </View>

                {/* Vitals summary */}
                <View style={styles.vitalsRow}>
                  {v.vitals.bloodPressure && (
                    <View style={styles.vitalBox}>
                      <Text style={styles.vitalVal}>{v.vitals.bloodPressure}</Text>
                      <Text style={styles.vitalLabel}>BP</Text>
                    </View>
                  )}
                  {v.vitals.pulse && (
                    <View style={styles.vitalBox}>
                      <Text style={styles.vitalVal}>{v.vitals.pulse} bpm</Text>
                      <Text style={styles.vitalLabel}>Pulse</Text>
                    </View>
                  )}
                  {v.vitals.spO2 && (
                    <View style={styles.vitalBox}>
                      <Text style={styles.vitalVal}>{v.vitals.spO2}%</Text>
                      <Text style={styles.vitalLabel}>SpO₂</Text>
                    </View>
                  )}
                  {v.vitals.bloodSugar && (
                    <View style={styles.vitalBox}>
                      <Text style={styles.vitalVal}>{v.vitals.bloodSugar}</Text>
                      <Text style={styles.vitalLabel}>Sugar</Text>
                    </View>
                  )}
                </View>

                {v.symptoms ? (
                  <Text style={styles.symptomsText}>💬 {v.symptoms}</Text>
                ) : null}

                {v.aiGuidanceInHindi ? (
                  <View style={styles.guidanceBox}>
                    <Text style={styles.guidanceText}>💡 {v.aiGuidanceInHindi}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Referrals Section */}
        {referrals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {lang === 'mr' ? 'रेफरल स्थिती' : lang === 'hi' ? 'रेफरल स्थिति' : 'Referral Status'}
            </Text>
            {referrals.map((r) => (
              <View key={r.id} style={styles.refCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.refFacility}>🏥 {r.destinationFacility}</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: r.priority === 'HIGH' || r.priority === 'CRITICAL' ? '#DC2626' : '#2563EB' }]}>
                    <Text style={styles.priorityText}>{r.priority}</Text>
                  </View>
                </View>
                <Text style={styles.refReason}>{r.reason}</Text>
                <Text style={styles.refMeta}>Ref Code: {r.referralCode} • Status: {r.status}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    marginBottom: 16,
  },
  avatarRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.redGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.red },
  patientName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  patientMeta: { fontSize: 12.5, color: colors.inkFaint, marginTop: 2 },
  crisisBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  crisisText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  detailGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 11, color: colors.inkFaint, fontWeight: '600' },
  gridVal: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 2 },
  riskTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tagPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sosButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  sosButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { color: colors.inkFaint, fontSize: 13 },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  visitDate: { fontSize: 13, fontWeight: '700', color: colors.ink },
  severityBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  severityText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  vitalsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  vitalBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalVal: { fontSize: 13, fontWeight: '700', color: colors.ink },
  vitalLabel: { fontSize: 10, color: colors.inkFaint, marginTop: 2 },
  symptomsText: { fontSize: 12.5, color: colors.inkSoft, marginBottom: 6 },
  guidanceBox: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 4 },
  guidanceText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  refCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refFacility: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priorityText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
  refReason: { fontSize: 12.5, color: colors.inkSoft, marginTop: 6 },
  refMeta: { fontSize: 11, color: colors.inkFaint, marginTop: 6 },
  backButton: { backgroundColor: colors.red, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 12 },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';

const PATIENTS_KEY = '@golden_hour_community_patients';
const VISITS_KEY = '@golden_hour_community_visits';
const REFERRALS_KEY = '@golden_hour_community_referrals';

export default function PatientDetailScreen() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [patient, setPatient] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'VISITS' | 'REFERRALS' | 'DETAILS'>('VISITS');

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      const rawPatients = await AsyncStorage.getItem(PATIENTS_KEY);
      if (rawPatients) {
        const list = JSON.parse(rawPatients);
        const p = list.find((item: any) => item.id === patientId);
        setPatient(p || null);
      }

      const rawVisits = await AsyncStorage.getItem(VISITS_KEY);
      if (rawVisits) {
        const list = JSON.parse(rawVisits);
        setVisits(list.filter((v: any) => v.patientId === patientId));
      }

      const rawReferrals = await AsyncStorage.getItem(REFERRALS_KEY);
      if (rawReferrals) {
        const list = JSON.parse(rawReferrals);
        setReferrals(list.filter((r: any) => r.patientId === patientId));
      }
    } catch {
      /* ignore */
    }
  };

  const handleStartSos = () => {
    Alert.alert(
      t('asha.emergencySos'),
      `Trigger immediate emergency SOS dispatch for ${patient?.name || 'patient'}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('asha.emergencySos'),
          style: 'destructive',
          onPress: () => {
            router.push({
              pathname: '/(patient)/emergency/start',
              params: {
                patientName: patient?.name,
                patientPhone: patient?.phone,
                village: patient?.villageOrArea,
              },
            });
          },
        },
      ]
    );
  };

  if (!patient) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevL" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('common.details')}</Text>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>Patient not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevL" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{patient.name}</Text>
        <LanguageSelector />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{patient.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{patient.name}</Text>
              <Text style={styles.profileSub}>
                {patient.age}y • {patient.gender === 'MALE' ? '♂ Male' : patient.gender === 'FEMALE' ? '♀ Female' : '⚧ Other'}
              </Text>
              <Text style={styles.profileLoc}>📍 {patient.villageOrArea || 'Village Sector'}</Text>
              {patient.phone ? (
                <Text style={styles.profilePhone}>📞 {patient.phone}</Text>
              ) : (
                <Text style={styles.profilePhoneDim}>📞 {t('common.phoneNotProvided')}</Text>
              )}
            </View>
          </View>

          {/* Badges / Flags */}
          <View style={styles.flagsRow}>
            {patient.crisisId && (
              <View style={[styles.flagBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Text style={[styles.flagText, { color: '#4338CA' }]}>ID: {patient.crisisId}</Text>
              </View>
            )}
            {patient.bloodGroup && (
              <View style={[styles.flagBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.flagText, { color: '#DC2626' }]}>🩸 {patient.bloodGroup}</Text>
              </View>
            )}
            {patient.isPregnant && (
              <View style={[styles.flagBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Text style={[styles.flagText, { color: '#EA580C' }]}>🤰 Pregnant {patient.expectedDeliveryDate ? `(EDD: ${patient.expectedDeliveryDate})` : ''}</Text>
              </View>
            )}
            {patient.knownConditions?.map((cond: string) => (
              <View key={cond} style={[styles.flagBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                <Text style={[styles.flagText, { color: colors.inkSoft }]}>{cond}</Text>
              </View>
            ))}
          </View>

          {/* Follow-up banner if scheduled */}
          {patient.followUpRequired && patient.followUpDate && (
            <View style={styles.followUpBanner}>
              <Text style={styles.followUpBannerText}>
                🗓 Next Follow-up: <Text style={{ fontWeight: '700' }}>{patient.followUpDate}</Text>
              </Text>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: colors.red }]}
              onPress={() => router.push({ pathname: '/(worker)/visit', params: { patientId: patient.id } })}
              activeOpacity={0.85}
            >
              <Text style={styles.quickBtnText}>+ {t('asha.recordVisit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#0284C7' }]}
              onPress={() => router.push({ pathname: '/(worker)/referral', params: { patientId: patient.id } })}
              activeOpacity={0.85}
            >
              <Text style={styles.quickBtnText}>↗ {t('asha.createPHCReferral')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleStartSos}
            activeOpacity={0.85}
          >
            <Icon name="ambulance" size={18} color="#fff" />
            <Text style={styles.sosButtonText}>{t('asha.actionSos')}</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'VISITS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('VISITS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'VISITS' && styles.tabBtnTextActive]}>
              {t('asha.pastVisits')} ({visits.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'REFERRALS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('REFERRALS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'REFERRALS' && styles.tabBtnTextActive]}>
              {t('asha.referrals')} ({referrals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content: Past Visits */}
        {activeTab === 'VISITS' && (
          <View style={{ gap: 10 }}>
            {visits.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('asha.noVisitsRecorded')}</Text>
              </View>
            ) : (
              visits.map((v) => (
                <View key={v.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyDate}>
                      {new Date(v.visitDate || v.createdAt).toLocaleDateString()}
                    </Text>
                    {v.aiTriageSeverity && (
                      <View
                        style={[
                          styles.triageTag,
                          {
                            backgroundColor:
                              v.aiTriageSeverity === 'CRITICAL'
                                ? '#FEE2E2'
                                : v.aiTriageSeverity === 'MODERATE'
                                ? '#FFEDD5'
                                : '#DCFCE7',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.triageTagText,
                            {
                              color:
                                v.aiTriageSeverity === 'CRITICAL'
                                  ? '#DC2626'
                                  : v.aiTriageSeverity === 'MODERATE'
                                  ? '#EA580C'
                                  : '#16A34A',
                            },
                          ]}
                        >
                          {v.aiTriageSeverity}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Vitals Summary */}
                  <View style={styles.vitalsGrid}>
                    <Text style={styles.vitalItem}>❤️ Pulse: {v.vitals?.pulse || '-'}</Text>
                    <Text style={styles.vitalItem}>🫁 SpO₂: {v.vitals?.spO2 ? `${v.vitals.spO2}%` : '-'}</Text>
                    <Text style={styles.vitalItem}>🩺 BP: {v.vitals?.bloodPressure || '-'}</Text>
                    <Text style={styles.vitalItem}>🌡️ Temp: {v.vitals?.temperature ? `${v.vitals.temperature}°F` : '-'}</Text>
                  </View>

                  {v.symptoms ? (
                    <Text style={styles.symptomsText}>📝 {v.symptoms}</Text>
                  ) : null}

                  {v.followUpDate ? (
                    <Text style={styles.followUpText}>🗓 Follow-up: {v.followUpDate}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab Content: Referrals */}
        {activeTab === 'REFERRALS' && (
          <View style={{ gap: 10 }}>
            {referrals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('asha.noReferralsRecorded')}</Text>
              </View>
            ) : (
              referrals.map((r) => (
                <View key={r.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.facilityNameTitle}>{r.facilityName || 'Emergency Facility'}</Text>
                    <View
                      style={[
                        styles.triageTag,
                        {
                          backgroundColor:
                            r.priority === 'CRITICAL'
                              ? '#FEE2E2'
                              : r.priority === 'HIGH'
                              ? '#FFEDD5'
                              : '#E0F2FE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.triageTagText,
                          {
                            color:
                              r.priority === 'CRITICAL'
                                ? '#DC2626'
                                : r.priority === 'HIGH'
                                ? '#EA580C'
                                : '#0284C7',
                          },
                        ]}
                      >
                        {r.priority}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.referralReasonText}>Reason: {r.reason}</Text>
                  <Text style={styles.referralDateText}>
                    Date: {new Date(r.createdAt).toLocaleDateString()} • Status: {r.status || 'TRANSMITTED'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
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
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  profileRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.redGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.red },
  profileName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  profileSub: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  profileLoc: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  profilePhone: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  profilePhoneDim: { fontSize: 11.5, color: colors.inkFaint, fontStyle: 'italic', marginTop: 2 },
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  flagText: { fontSize: 11, fontWeight: '600' },
  followUpBanner: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
  },
  followUpBannerText: { fontSize: 12, color: '#92400E' },
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  sosButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  tabBtnText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
  tabBtnTextActive: { color: colors.ink, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { color: colors.inkFaint, fontSize: 13 },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: { fontSize: 13, fontWeight: '700', color: colors.ink },
  facilityNameTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink, flex: 1 },
  triageTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  triageTagText: { fontSize: 10.5, fontWeight: '700' },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 6,
  },
  vitalItem: { fontSize: 12, color: colors.inkSoft },
  symptomsText: { fontSize: 12, color: colors.ink, marginTop: 4 },
  followUpText: { fontSize: 11.5, color: '#0284C7', fontWeight: '600', marginTop: 4 },
  referralReasonText: { fontSize: 12.5, color: colors.ink, marginVertical: 4 },
  referralDateText: { fontSize: 11, color: colors.inkFaint },
});

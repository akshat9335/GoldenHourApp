import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { processOfflineQueue, getPendingCount } from '@/services/offlineSync';

const PATIENTS_KEY = '@golden_hour_community_patients';
const VISITS_KEY = '@golden_hour_community_visits';
const REFERRALS_KEY = '@golden_hour_community_referrals';

interface CommunityPatient {
  id: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  villageOrArea: string;
  bloodGroup?: string;
  isPregnant?: boolean;
  knownConditions?: string[];
  lastVisitDate?: string;
  followUpDate?: string;
  crisisId: string;
  createdAt: string;
}

export default function WorkerDashboard() {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<CommunityPatient[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active category / tab in dashboard
  const [activeTab, setActiveTab] = useState<'PATIENTS' | 'TODAY_VISITS' | 'REFERRALS'>('PATIENTS');

  const loadAllData = async () => {
    try {
      const rawPatients = await AsyncStorage.getItem(PATIENTS_KEY);
      if (rawPatients) setPatients(JSON.parse(rawPatients));

      const rawVisits = await AsyncStorage.getItem(VISITS_KEY);
      if (rawVisits) setVisits(JSON.parse(rawVisits));

      const rawReferrals = await AsyncStorage.getItem(REFERRALS_KEY);
      if (rawReferrals) setReferrals(JSON.parse(rawReferrals));

      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      /* ignore */
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Please connect to the internet to sync.');
      return;
    }
    setIsSyncing(true);
    const result = await processOfflineQueue();
    setIsSyncing(false);
    await loadAllData();
    Alert.alert(
      'Sync Complete',
      `✓ ${result.success} records synced${result.failed ? `, ${result.failed} failed` : ''}.`
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.villageOrArea.toLowerCase().includes(search.toLowerCase())
  );

  // Today's or scheduled follow-up visits
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysVisits = visits.filter((v) => {
    const vDate = (v.visitDate || v.createdAt || '').split('T')[0];
    return vDate === todayStr;
  });

  const getBannerConfig = () => {
    if (isSyncing) return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', msg: 'Syncing records…' };
    if (pendingCount > 0 && !isOnline)
      return { bg: '#FEFCE8', border: '#F59E0B', text: '#92400E', msg: t('asha.offlineBanner', { count: pendingCount }) };
    if (pendingCount > 0 && isOnline)
      return { bg: '#FEF3C7', border: '#D97706', text: '#78350F', msg: `${pendingCount} records pending sync — tap to sync now.` };
    return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', msg: t('asha.syncedBanner') };
  };

  const banner = getBannerConfig();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('asha.title')}</Text>
          <Text style={styles.headerSub}>{t('asha.workerMode')}</Text>
        </View>
        <LanguageSelector />
      </View>

      {/* Sync Banner */}
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: banner.bg, borderColor: banner.border }]}
        onPress={handleSync}
        activeOpacity={pendingCount > 0 ? 0.75 : 1}
      >
        <View style={[styles.bannerDot, { backgroundColor: banner.border }]} />
        <Text style={[styles.bannerText, { color: banner.text }]}>{banner.msg}</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Core Metrics Cards (MVP Requirement #2) */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'PATIENTS' && styles.metricCardActive]}
            onPress={() => setActiveTab('PATIENTS')}
          >
            <Text style={styles.metricNumber}>{patients.length}</Text>
            <Text style={styles.metricLabel}>{t('asha.communityPatients')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'TODAY_VISITS' && styles.metricCardActive]}
            onPress={() => setActiveTab('TODAY_VISITS')}
          >
            <Text style={styles.metricNumber}>{todaysVisits.length}</Text>
            <Text style={styles.metricLabel}>{t('asha.todaysVisits')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, activeTab === 'REFERRALS' && styles.metricCardActive]}
            onPress={() => setActiveTab('REFERRALS')}
          >
            <Text style={styles.metricNumber}>{referrals.length}</Text>
            <Text style={styles.metricLabel}>{t('asha.pendingReferrals')}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.red }]}
            onPress={() => router.push('/(worker)/register-patient')}
            activeOpacity={0.85}
          >
            <Icon name="profile" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>{t('asha.registerPatient')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0284C7' }]}
            onPress={() => router.push('/(worker)/visit')}
            activeOpacity={0.85}
          >
            <Icon name="calendar" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>{t('asha.recordVisit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            onPress={() => router.push('/(patient)/emergency/start')}
            activeOpacity={0.85}
          >
            <Icon name="ambulance" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>{t('asha.reportEmergency')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section Tabs View */}
        {activeTab === 'PATIENTS' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('asha.patientsDirectory')}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('asha.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.inkFaint}
            />

            {filteredPatients.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="profile" size={32} color={colors.inkFaint} />
                <Text style={styles.emptyText}>{t('asha.noPatients')}</Text>
              </View>
            ) : (
              filteredPatients.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.patientCard}
                  onPress={() => router.push({ pathname: '/(worker)/patient-detail', params: { patientId: p.id } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{p.name}</Text>
                    <Text style={styles.patientMeta}>
                      {p.age}y • {p.gender === 'MALE' ? '♂' : p.gender === 'FEMALE' ? '♀' : '⚧'} • {p.villageOrArea}
                    </Text>
                    {p.isPregnant && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>🤰 Pregnant</Text>
                      </View>
                    )}
                  </View>
                  <Icon name="chevR" color={colors.inkFaint} size={16} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'TODAY_VISITS' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('asha.todaysVisits')}</Text>
            {todaysVisits.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No visits recorded yet today.</Text>
                <TouchableOpacity
                  style={[styles.smallActionBtn, { marginTop: 10 }]}
                  onPress={() => router.push('/(worker)/visit')}
                >
                  <Text style={styles.smallActionBtnText}>+ Record Visit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              todaysVisits.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.itemCard}
                  onPress={() => router.push({ pathname: '/(worker)/patient-detail', params: { patientId: v.patientId } })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeaderTitle}>{v.patientName}</Text>
                    <Text style={styles.cardMetaText}>
                      Pulse: {v.vitals?.pulse || '-'} BPM • SpO₂: {v.vitals?.spO2 || '-'}% • BP: {v.vitals?.bloodPressure || '-'}
                    </Text>
                    {v.aiTriageSeverity && (
                      <Text style={[styles.triageText, { color: v.aiTriageSeverity === 'CRITICAL' ? '#DC2626' : '#16A34A' }]}>
                        Triage: {v.aiTriageSeverity}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevR" color={colors.inkFaint} size={16} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'REFERRALS' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('asha.pendingReferrals')}</Text>
            {referrals.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No referrals recorded.</Text>
                <TouchableOpacity
                  style={[styles.smallActionBtn, { marginTop: 10 }]}
                  onPress={() => router.push('/(worker)/referral')}
                >
                  <Text style={styles.smallActionBtnText}>+ Create Referral</Text>
                </TouchableOpacity>
              </View>
            ) : (
              referrals.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.itemCard}
                  onPress={() => router.push({ pathname: '/(worker)/patient-detail', params: { patientId: r.patientId } })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeaderTitle}>{r.patientName} ➔ {r.facilityName || 'Emergency Hospital'}</Text>
                    <Text style={styles.cardMetaText}>Reason: {r.reason}</Text>
                    <Text style={styles.cardSubText}>Priority: {r.priority} • Status: {r.status || 'PENDING'}</Text>
                  </View>
                  <Icon name="chevR" color={colors.inkFaint} size={16} />
                </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  headerSub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bannerText: { fontSize: 12.5, fontWeight: '600', flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  metricCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  metricNumber: { fontSize: 20, fontWeight: '800', color: colors.ink },
  metricLabel: { fontSize: 10.5, fontWeight: '600', color: colors.inkSoft, textAlign: 'center', marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    elevation: 2,
    gap: 4,
  },
  actionBtnText: { color: '#fff', fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  section: {},
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyText: { color: colors.inkFaint, fontSize: 13, textAlign: 'center' },
  smallActionBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallActionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.redGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: { fontSize: 18, fontWeight: '800', color: colors.red },
  patientName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  patientMeta: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  badge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10.5, color: '#C2410C', fontWeight: '600' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    gap: 12,
  },
  cardHeaderTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  cardMetaText: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  cardSubText: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  triageText: { fontSize: 11, fontWeight: '700', marginTop: 3 },
});

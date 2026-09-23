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
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { processOfflineQueue, getPendingCount } from '@/services/offlineSync';
import { getApiBaseUrl } from '@/services/api';

const PATIENTS_KEY = '@golden_hour_community_patients';
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
  knownConditions?: string[];
  lastVisitDate?: string;
  crisisId: string;
  createdAt: string;
}

export default function WorkerDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [patients, setPatients] = useState<CommunityPatient[]>([]);
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingReferralsCount, setPendingReferralsCount] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadPatients();
    loadPendingCount();
    loadReferralsCount();

    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  const loadPatients = async () => {
    try {
      const raw = await AsyncStorage.getItem(PATIENTS_KEY);
      if (raw) {
        setPatients(JSON.parse(raw));
      } else {
        // Seed default rural Prayagraj patients for offline presentation
        const seedPatients: CommunityPatient[] = [
          {
            id: 'pat-seed-01',
            crisisId: 'CR-PRAYAG-001',
            name: 'Sunita Devi',
            age: 26,
            gender: 'FEMALE',
            phone: '9876543210',
            villageOrArea: 'Naini Rural Sub-Center',
            bloodGroup: 'B+',
            knownConditions: ['Severe Anemia'],
            isPregnant: true,
            lastVisitDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'pat-seed-02',
            crisisId: 'CR-PRAYAG-002',
            name: 'Rameshwar Yadav',
            age: 62,
            gender: 'MALE',
            phone: '9812345678',
            villageOrArea: 'Shankargarh Village',
            bloodGroup: 'O+',
            knownConditions: ['Hypertension', 'Type 2 Diabetes'],
            isPregnant: false,
            lastVisitDate: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'pat-seed-03',
            crisisId: 'CR-PRAYAG-003',
            name: 'Meera Devi',
            age: 31,
            gender: 'FEMALE',
            phone: '',
            villageOrArea: 'Phaphamau Basti',
            bloodGroup: 'A+',
            knownConditions: ['Postpartum Hemorrhage History'],
            isPregnant: false,
            lastVisitDate: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
            createdAt: new Date().toISOString(),
          },
        ];
        await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(seedPatients));
        setPatients(seedPatients);
      }

      // If online, fetch fresh list from backend
      try {
        const baseUrl = getApiBaseUrl ? getApiBaseUrl() : 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/worker/patients`, {
          headers: { 'Bypass-Tunnel-Reminder': 'true' },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            setPatients(json.data);
            await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(json.data));
          }
        }
      } catch {
        // Use local cache
      }
    } catch {
      // ignore
    }
  };

  const loadPendingCount = async () => {
    setPendingCount(await getPendingCount());
  };

  const loadReferralsCount = async () => {
    try {
      const raw = await AsyncStorage.getItem(REFERRALS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        setPendingReferralsCount(list.filter((r: any) => r.status === 'PENDING').length);
      }
    } catch {
      // ignore
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        lang === 'hi' ? 'ऑफ़लाइन मोड' : 'Offline',
        lang === 'hi'
          ? 'डेटा डिवाइस में सुरक्षित है। इंटरनेट कनेक्ट होने पर स्वतः सिंक हो जाएगा।'
          : 'Records are securely queued locally and will auto-sync once internet is connected.'
      );
      return;
    }
    setIsSyncing(true);
    const result = await processOfflineQueue();
    setIsSyncing(false);
    await loadPendingCount();
    Alert.alert(
      lang === 'hi' ? 'सिंक पूरा हुआ' : 'Sync Complete',
      `✓ ${result.success} ${lang === 'hi' ? 'रिकॉर्ड क्लाउड पर सिंक हुए' : 'records synced to cloud'}${
        result.failed ? `, ${result.failed} failed` : ''
      }.`
    );
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.villageOrArea.toLowerCase().includes(search.toLowerCase())
  );

  const getBannerConfig = () => {
    if (isSyncing)
      return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', msg: lang === 'hi' ? 'रिकॉर्ड सिंक हो रहे हैं…' : 'Syncing records…' };
    if (pendingCount > 0 && !isOnline)
      return {
        bg: '#FEFCE8',
        border: '#F59E0B',
        text: '#92400E',
        msg: lang === 'hi' ? `${pendingCount} रिकॉर्ड ऑफ़लाइन सुरक्षित हैं। नेटवर्क मिलने पर सिंक होंगे।` : `${pendingCount} records saved offline. Will auto-sync when online.`,
      };
    if (pendingCount > 0 && isOnline)
      return {
        bg: '#FEF3C7',
        border: '#D97706',
        text: '#78350F',
        msg: lang === 'hi' ? `${pendingCount} रिकॉर्ड सिंक के लिए तैयार — टैप करके सिंक करें।` : `${pendingCount} records pending sync — tap to sync now.`,
      };
    return {
      bg: '#ECFDF5',
      border: '#10B981',
      text: '#065F46',
      msg: lang === 'hi' ? 'सभी डेटा सिंक है ✓ (ऑफ़लाइन तैयार)' : 'All data synced with cloud ✓ (Offline-Ready)',
    };
  };

  const banner = getBannerConfig();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{lang === 'hi' ? 'गोल्डन ऑवर फ़्रंटलाइन' : 'Golden Hour Frontline'}</Text>
          <Text style={styles.headerSub}>{lang === 'hi' ? 'आशा / एएनएम स्वास्थ्य कार्यकर्ता कंसोल' : 'ASHA / ANM Frontline Worker Console'}</Text>
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
        {pendingCount > 0 && isOnline && (
          <Text style={{ fontSize: 11, fontWeight: '700', color: banner.text }}>SYNC ⟳</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 3 Top Summary Metrics Cards (MVP Blueprint Scope) */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderLeftColor: '#0284C7' }]}>
            <Text style={styles.metricVal}>{patients.length}</Text>
            <Text style={styles.metricLabel}>{lang === 'hi' ? 'समुदाय के मरीज' : 'Community Patients'}</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.metricVal}>2</Text>
            <Text style={styles.metricLabel}>{lang === 'hi' ? 'आज की जाँच' : "Today's Visits"}</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#DC2626' }]}>
            <Text style={styles.metricVal}>{pendingReferralsCount}</Text>
            <Text style={styles.metricLabel}>{lang === 'hi' ? 'लंबित रेफरल' : 'Pending Referrals'}</Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#15803D' }]}
            onPress={() => router.push('/(worker)/register-patient' as any)}
            activeOpacity={0.85}
          >
            <Icon name="profile" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>{lang === 'hi' ? 'नया मरीज जोड़ें' : 'Register Patient'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0284C7' }]}
            onPress={() => router.push('/(worker)/referral' as any)}
            activeOpacity={0.85}
          >
            <Icon name="hospital" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>{lang === 'hi' ? 'डिजिटल रेफरल' : 'New Referral'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            onPress={() => router.push('/(patient)/emergency/start' as any)}
            activeOpacity={0.85}
          >
            <Icon name="ambulance" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>{lang === 'hi' ? 'इमरजेंसी SOS' : 'Emergency SOS'}</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Directory */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>{lang === 'hi' ? 'गाँव के मरीजों की सूची' : 'Village Patients Directory'}</Text>
            <Text style={styles.sectionCount}>({filtered.length})</Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={lang === 'hi' ? 'नाम या गाँव से खोजें…' : 'Search by patient name or village…'}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.inkFaint}
          />

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="profile" size={32} color={colors.inkFaint} />
              <Text style={styles.emptyText}>{t('asha.noPatients')}</Text>
            </View>
          ) : (
            filtered.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.patientCard}
                onPress={() => router.push({ pathname: '/(worker)/patient-detail' as any, params: { patientId: p.id } })}
                activeOpacity={0.8}
              >
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.patientName}>{p.name}</Text>
                    <Text style={styles.crisisBadge}>{p.crisisId || 'ID'}</Text>
                  </View>
                  <Text style={styles.patientMeta}>
                    {p.age}y • {p.gender === 'MALE' ? '♂' : p.gender === 'FEMALE' ? '♀' : '⚧'} • {p.villageOrArea}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {p.isPregnant && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>🤰 {lang === 'hi' ? 'गर्भवती' : 'Pregnant'}</Text>
                      </View>
                    )}
                    {p.knownConditions?.map((c, i) => (
                      <View key={i} style={[styles.badge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                        <Text style={[styles.badgeText, { color: '#B91C1C' }]}>⚠️ {c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Icon name="chevR" color={colors.inkFaint} size={16} />
              </TouchableOpacity>
            ))
          )}
        </View>
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
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
  headerSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  bannerDot: { width: 8, height: 8, borderRadius: 4 },
  bannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    elevation: 2,
  },
  metricVal: { fontSize: 20, fontWeight: '800', color: colors.ink },
  metricLabel: { fontSize: 10.5, color: colors.inkSoft, fontWeight: '600', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  section: {},
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sectionCount: { fontSize: 13, color: colors.inkFaint, fontWeight: '600' },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: colors.ink,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.inkFaint, fontSize: 13, textAlign: 'center' },
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
  patientName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  patientMeta: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  crisisBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badge: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: '#C2410C', fontWeight: '600' },
});

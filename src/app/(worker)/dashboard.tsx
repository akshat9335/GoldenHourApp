import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { processOfflineQueue, getPendingCount } from '@/services/offlineSync';
import { api, getApiBaseUrl } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';

const getPatientsKey = (uid?: string) =>
  uid && !uid.startsWith('asha-demo')
    ? `@golden_hour_community_patients_${uid}`
    : '@golden_hour_community_patients_demo';

const REFERRALS_KEY = '@golden_hour_community_referrals';
const VISITS_KEY = '@golden_hour_community_visits';

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

  const userProfile = useAppStore((s) => s.userProfile);
  const workerUid = userProfile?.uid;
  const isDemoMode = !workerUid || workerUid === 'asha-demo-1' || workerUid.startsWith('asha-demo');

  const [patients, setPatients] = useState<CommunityPatient[]>([]);
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingReferralsCount, setPendingReferralsCount] = useState(0);
  const [todayVisitsCount, setTodayVisitsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const storageKey = getPatientsKey(workerUid);
      const raw = await AsyncStorage.getItem(storageKey);
      let localList: CommunityPatient[] = raw ? JSON.parse(raw) : [];

      if (isDemoMode && localList.length === 0) {
        // Seed default rural Prayagraj patients ONLY in demo mode
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
        ];
        localList = seedPatients;
        await AsyncStorage.setItem(storageKey, JSON.stringify(seedPatients));
      } else if (!isDemoMode) {
        // Purge any leaked seed demo patients from real worker storage
        localList = localList.filter((p) => p && p.name && !p.id.startsWith('pat-seed-'));
      }

      // Filter out any corrupted stubs without names
      localList = localList.filter((p) => p && p.name);
      setPatients(localList);

      // If online, fetch real patients from backend for this worker
      try {
        const queryUid = isDemoMode ? 'asha-worker-prayagraj' : workerUid;
        const res: any = await api.worker.getPatients(queryUid);
        const list = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(list)) {
          const validBackendList: CommunityPatient[] = list.filter(
            (p: CommunityPatient) => p && p.name && (isDemoMode || !p.id.startsWith('pat-seed-'))
          );

          // Deduplicate smartly by ID and semantic profile (name + phone/village)
          const getDedupKey = (p: CommunityPatient): string => {
            if (p.phone && p.phone.trim().length >= 4) {
              return `phone::${p.phone.replace(/[^0-9]/g, '')}`;
            }
            const normName = (p.name || '').trim().toLowerCase();
            const normVillage = (p.villageOrArea || '').trim().toLowerCase();
            return `sem::${normName}_${p.age || 0}_${normVillage}`;
          };

          const idMap = new Map<string, CommunityPatient>();
          const dedupMap = new Map<string, CommunityPatient>();

          // Backend is primary source of truth for IDs & synced timestamps
          validBackendList.forEach((p: CommunityPatient) => {
            idMap.set(p.id, p);
            dedupMap.set(getDedupKey(p), p);
          });

          // Merge local cache
          localList.forEach((localP: CommunityPatient) => {
            const semKey = getDedupKey(localP);
            if (idMap.has(localP.id)) {
              const existing = idMap.get(localP.id)!;
              idMap.set(localP.id, { ...localP, ...existing });
            } else if (dedupMap.has(semKey)) {
              // Same patient registered with local temporary ID vs backend generated ID
              const existing = dedupMap.get(semKey)!;
              const merged = { ...localP, ...existing };
              idMap.set(existing.id, merged);
              dedupMap.set(semKey, merged);
            } else {
              idMap.set(localP.id, localP);
              dedupMap.set(semKey, localP);
            }
          });

          const merged = Array.from(idMap.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          setPatients(merged);
          await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
        }
      } catch {
        // Use local cache
      }
    } catch {
      // ignore
    }
  }, [workerUid, isDemoMode]);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
      loadPendingCount();
      loadReferralsCount();
      loadVisitsCount();
      loadBackendStats();
    }, [loadPatients])
  );

  const handleSwitchRole = () => {
    router.replace('/role-selection');
  };

  const handleLogout = () => {
    Alert.alert(
      lang === 'hi' ? 'लॉग आउट' : 'Log Out',
      lang === 'hi' ? 'क्या आप ASHA कंसोल से लॉग आउट करना चाहते हैं?' : 'Are you sure you want to log out of ASHA console?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: lang === 'hi' ? 'लॉग आउट करें' : 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            router.replace('/role-selection');
          },
        },
      ]
    );
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

  const loadVisitsCount = async () => {
    try {
      const raw = await AsyncStorage.getItem(VISITS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const todayStr = new Date().toISOString().slice(0, 10);
        const count = list.filter((v: any) => (v.visitDate || v.createdAt || '').slice(0, 10) === todayStr).length;
        setTodayVisitsCount(count);
      }
    } catch {}
  };

  const loadBackendStats = async () => {
    try {
      const res: any = await api.worker.getStats();
      const stats = res?.data || res;
      if (stats) {
        if (typeof stats.scheduledVisitsToday === 'number' && stats.scheduledVisitsToday > 0) {
          setTodayVisitsCount(stats.scheduledVisitsToday);
        }
        if (typeof stats.pendingReferrals === 'number') {
          setPendingReferralsCount(stats.pendingReferrals);
        }
      }
    } catch {}
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        lang === 'mr' ? 'ऑफलाइन मोड' : lang === 'hi' ? 'ऑफ़लाइन मोड' : 'Offline',
        lang === 'mr'
          ? 'डेटा डिव्हाइसवर सुरक्षित आहे. इंटरनेट कनेक्ट झाल्यावर आपोआप सिंक होईल.'
          : lang === 'hi'
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
      lang === 'mr' ? 'सिंक पूर्ण झाले' : lang === 'hi' ? 'सिंक पूरा हुआ' : 'Sync Complete',
      `✓ ${result.success} ${lang === 'mr' ? 'रेकॉर्ड्स क्लाउडवर सिंक झाले' : lang === 'hi' ? 'रिकॉर्ड क्लाउड पर सिंक हुए' : 'records synced to cloud'}${
        result.failed ? `, ${result.failed} failed` : ''
      }.`
    );
  };

  const filtered = patients.filter(
    (p) =>
      (p?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p?.villageOrArea || '').toLowerCase().includes(search.toLowerCase())
  );

  const getBannerConfig = () => {
    if (isSyncing)
      return {
        bg: '#EFF6FF',
        border: '#3B82F6',
        text: '#1E40AF',
        msg: lang === 'mr' ? 'रेकॉर्ड्स सिंक होत आहेत…' : lang === 'hi' ? 'रिकॉर्ड सिंक हो रहे हैं…' : 'Syncing records…',
      };
    if (pendingCount > 0 && !isOnline)
      return {
        bg: '#FEFCE8',
        border: '#F59E0B',
        text: '#92400E',
        msg: lang === 'mr'
          ? `${pendingCount} रेकॉर्ड्स ऑफलाइन सुरक्षित आहेत. नेटवर्क आल्यावर सिंक होतील.`
          : lang === 'hi'
          ? `${pendingCount} रिकॉर्ड ऑफ़लाइन सुरक्षित हैं। नेटवर्क मिलने पर सिंक होंगे।`
          : `${pendingCount} records saved offline. Will auto-sync when online.`,
      };
    if (pendingCount > 0 && isOnline)
      return {
        bg: '#FEF3C7',
        border: '#D97706',
        text: '#78350F',
        msg: lang === 'mr'
          ? `${pendingCount} रेकॉर्ड्स सिंकसाठी तयार — टॅप करून सिंक करा.`
          : lang === 'hi'
          ? `${pendingCount} रिकॉर्ड सिंक के लिए तैयार — टैप करके सिंक करें।`
          : `${pendingCount} records pending sync — tap to sync now.`,
      };
    return {
      bg: '#ECFDF5',
      border: '#10B981',
      text: '#065F46',
      msg: lang === 'mr'
        ? 'सर्व डेटा सिंक आहे ✓ (ऑफलाइन सज्ज)'
        : lang === 'hi'
        ? 'सभी डेटा सिंक है ✓ (ऑफ़लाइन तैयार)'
        : 'All data synced with cloud ✓ (Offline-Ready)',
    };
  };

  const banner = getBannerConfig();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {lang === 'mr' ? 'गोल्डन अवर फ्रंटलाइन' : lang === 'hi' ? 'गोल्डन ऑवर फ़्रंटलाइन' : 'Golden Hour Frontline'}
          </Text>
          <Text style={styles.headerSub}>
            {lang === 'mr' ? 'आशा / एएनएम आरोग्य सेविका कन्सोल' : lang === 'hi' ? 'आशा / एएनएम स्वास्थ्य कार्यकर्ता कंसोल' : 'ASHA / ANM Frontline Worker Console'}
          </Text>
        </View>
        <LanguageSelector />
      </View>

      {/* Worker Identity Card */}
      <View style={styles.workerCard}>
        <View style={styles.workerInfoRow}>
          <View style={styles.workerAvatar}>
            <Text style={styles.workerAvatarText}>
              {(userProfile?.name ? userProfile.name.charAt(0) : 'A').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.workerName} numberOfLines={1}>
                {userProfile?.name || (isDemoMode ? 'Sunita Devi (ASHA Sangini)' : 'ASHA Worker')}
              </Text>
              {isDemoMode && (
                <View style={styles.demoBadge}>
                  <Text style={styles.demoBadgeText}>DEMO</Text>
                </View>
              )}
            </View>
            <Text style={styles.workerSub} numberOfLines={1}>
              {userProfile?.workerType || (isDemoMode ? 'ASHA Sangini' : 'Frontline Worker')} • {userProfile?.assignedPhc || userProfile?.village || 'Prayagraj PHC'}
            </Text>
          </View>
        </View>

        <View style={styles.workerActions}>
          <TouchableOpacity
            style={styles.switchRoleBtn}
            onPress={handleSwitchRole}
            activeOpacity={0.8}
          >
            <Text style={styles.switchRoleText}>‹ {lang === 'hi' ? 'रोल बदलें' : 'Switch Role'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>{lang === 'hi' ? 'लॉग आउट' : 'Log Out'}</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.metricLabel}>
              {lang === 'mr' ? 'समुदायातील रुग्ण' : lang === 'hi' ? 'समुदाय के मरीज' : 'Community Patients'}
            </Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.metricVal}>{todayVisitsCount}</Text>
            <Text style={styles.metricLabel}>
              {lang === 'mr' ? 'आजच्या तपासण्या' : lang === 'hi' ? 'आज की जाँच' : "Today's Visits"}
            </Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#DC2626' }]}>
            <Text style={styles.metricVal}>{pendingReferralsCount}</Text>
            <Text style={styles.metricLabel}>
              {lang === 'mr' ? 'प्रलंबित रेफरल्स' : lang === 'hi' ? 'लंबित रेफरल' : 'Pending Referrals'}
            </Text>
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
            <Text style={styles.actionBtnText}>
              {lang === 'mr' ? 'नवीन रुग्ण जोडा' : lang === 'hi' ? 'नया मरीज जोड़ें' : 'Register Patient'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0284C7' }]}
            onPress={() => router.push('/(worker)/referral' as any)}
            activeOpacity={0.85}
          >
            <Icon name="hospital" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>
              {lang === 'mr' ? 'डिजिटल रेफरल' : lang === 'hi' ? 'डिजिटल रेफरल' : 'New Referral'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            onPress={() => router.push('/(patient)/emergency/start' as any)}
            activeOpacity={0.85}
          >
            <Icon name="ambulance" size={17} color="#fff" />
            <Text style={styles.actionBtnText}>
              {lang === 'mr' ? 'आपत्कालीन SOS' : lang === 'hi' ? 'इमरजेंसी SOS' : 'Emergency SOS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patient Directory */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>
              {lang === 'mr' ? 'गावातील रुग्णांची यादी' : lang === 'hi' ? 'गाँव के मरीजों की सूची' : 'Village Patients Directory'}
            </Text>
            <Text style={styles.sectionCount}>({filtered.length})</Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={lang === 'mr' ? 'नाव किंवा गावावरून शोधा…' : lang === 'hi' ? 'नाम या गाँव से खोजें…' : 'Search by patient name or village…'}
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
                  <Text style={styles.patientAvatarText}>{((p?.name || 'P').trim().charAt(0) || 'P').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.patientName}>{p?.name || (lang === 'hi' ? 'अज्ञात रोगी' : 'Unnamed Patient')}</Text>
                    <Text style={styles.crisisBadge}>{p?.crisisId || p?.id || 'ID'}</Text>
                  </View>
                  <Text style={styles.patientMeta}>
                    {p?.age ?? '--'}y • {p?.gender === 'MALE' ? '♂' : p?.gender === 'FEMALE' ? '♀' : '⚧'} • {p?.villageOrArea || (lang === 'hi' ? 'ग्रामीण क्षेत्र' : 'Rural Area')}
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
  workerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  workerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  workerSub: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  demoBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400E',
  },
  workerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchRoleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  switchRoleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
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

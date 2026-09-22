import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
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

const PATIENTS_KEY = '@golden_hour_community_patients';

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
  const { t } = useTranslation();
  const [patients, setPatients] = useState<CommunityPatient[]>([]);
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load patients from local storage
  useEffect(() => {
    loadPatients();
    loadPendingCount();

    // Subscribe to network changes
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  const loadPatients = async () => {
    try {
      const raw = await AsyncStorage.getItem(PATIENTS_KEY);
      if (raw) setPatients(JSON.parse(raw));
    } catch { /* ignore */ }
  };

  const loadPendingCount = async () => {
    setPendingCount(await getPendingCount());
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Please connect to the internet to sync.');
      return;
    }
    setIsSyncing(true);
    const result = await processOfflineQueue();
    setIsSyncing(false);
    await loadPendingCount();
    Alert.alert(
      'Sync Complete',
      `✓ ${result.success} records synced${result.failed ? `, ${result.failed} failed` : ''}.`,
    );
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.villageOrArea.toLowerCase().includes(search.toLowerCase()),
  );

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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.red }]}
            onPress={() => router.push('/(worker)/register-patient')}
            activeOpacity={0.85}
          >
            <Icon name="profile" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{t('asha.registerPatient')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            onPress={() => router.push('/(patient)/emergency/start')}
            activeOpacity={0.85}
          >
            <Icon name="siren" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{t('asha.emergencySos')}</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Directory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('asha.patientsDirectory')}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('asha.searchPlaceholder')}
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
                onPress={() => router.push({ pathname: '/(worker)/visit', params: { patientId: p.id } })}
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
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '@/constants/theme';
import { Icon } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { enqueueOfflineAction } from '@/services/offlineSync';
import { getApiBaseUrl } from '@/services/api';

const PATIENTS_KEY = '@golden_hour_community_patients';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export default function RegisterPatient() {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('FEMALE');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [chronicBP, setChronicBP] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [heartDisease, setHeartDisease] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('asha.enterPatientName'));
      return;
    }
    setIsSaving(true);

    const knownConditions: string[] = [];
    if (chronicBP) knownConditions.push('Chronic BP');
    if (diabetes) knownConditions.push('Diabetes');
    if (heartDisease) knownConditions.push('Heart Disease');

    const patient = {
      id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      crisisId: `CR-${Date.now().toString(36).toUpperCase()}`,
      workerUid: 'asha-worker-local',
      workerName: 'ASHA Worker',
      name: name.trim(),
      age: parseInt(age || '0', 10),
      gender,
      phone: phone.trim(),
      villageOrArea: village.trim(),
      bloodGroup: bloodGroup.trim() || undefined,
      isPregnant,
      expectedDeliveryDate: isPregnant ? expectedDelivery.trim() : undefined,
      knownConditions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save locally first (offline-first)
      const raw = await AsyncStorage.getItem(PATIENTS_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify([...existing, patient]));

      // Try to sync to backend, else queue it
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        try {
          const baseUrl = getApiBaseUrl ? getApiBaseUrl() : 'https://goldenhourapp.onrender.com';
          const res = await fetch(`${baseUrl}/api/worker/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify(patient),
          });
          if (!res.ok) throw new Error('Server error');
        } catch {
          await enqueueOfflineAction('/api/worker/patients', 'POST', patient);
        }
      } else {
        await enqueueOfflineAction('/api/worker/patients', 'POST', patient);
      }

      Alert.alert(t('asha.patientRegistered'), t('asha.patientSaved'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), 'Could not save patient. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevL" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('asha.registerPatient')}</Text>
        <LanguageSelector />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.quickTriage')}</Text>

          <Text style={styles.label}>{t('asha.patientName')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sunita Devi"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.inkFaint}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>{t('asha.patientAge')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 28"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                placeholderTextColor={colors.inkFaint}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>{t('asha.phone')}</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={colors.inkFaint}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('asha.village')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rampur Sub-Center"
            value={village}
            onChangeText={setVillage}
            placeholderTextColor={colors.inkFaint}
          />

          {/* Gender */}
          <Text style={styles.label}>{t('asha.gender')}</Text>
          <View style={styles.segRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.segBtn, gender === g && styles.segBtnActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.segBtnText, gender === g && styles.segBtnTextActive]}>
                  {t(`asha.${g.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Blood Group */}
          <Text style={styles.label}>{t('asha.bloodGroup')}</Text>
          <View style={styles.segRow}>
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity
                key={bg}
                style={[styles.bgBtn, bloodGroup === bg && styles.bgBtnActive]}
                onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
              >
                <Text style={[styles.bgBtnText, bloodGroup === bg && styles.bgBtnTextActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* High-Risk Flags */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('asha.knownConditions')}</Text>

          {/* Pregnant toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{t('asha.isPregnant')} 🤰</Text>
            </View>
            <Switch
              value={isPregnant}
              onValueChange={setIsPregnant}
              trackColor={{ true: colors.red }}
              thumbColor={isPregnant ? '#fff' : '#f4f3f4'}
            />
          </View>
          {isPregnant && (
            <>
              <Text style={styles.label}>{t('asha.expectedDelivery')}</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                value={expectedDelivery}
                onChangeText={setExpectedDelivery}
                placeholderTextColor={colors.inkFaint}
              />
            </>
          )}

          {/* Chronic conditions */}
          {[
            { key: 'chronicBP', label: t('asha.chronicBP'), val: chronicBP, set: setChronicBP },
            { key: 'diabetes', label: t('asha.diabetes'), val: diabetes, set: setDiabetes },
            { key: 'heartDisease', label: t('asha.heartDisease'), val: heartDisease, set: setHeartDisease },
          ].map(({ key, label, val, set }) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { flex: 1 }]}>{label}</Text>
              <Switch
                value={val}
                onValueChange={set}
                trackColor={{ true: colors.red }}
                thumbColor={val ? '#fff' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Saving…' : t('common.save') + ' — Works Offline ✓'}
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 14 },
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
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  segBtnActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  segBtnText: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  segBtnTextActive: { color: '#fff' },
  bgBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bgBtnActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  bgBtnText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  bgBtnTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    marginBottom: 4,
  },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  saveBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Banner, Icon, Pill } from '@/components/ui';
import { openExternalMapPreview, openExternalVoiceNavigation } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { watchDeviceLocation } from '@/services/deviceLocation';

export default function PickedUp() {
  const params = useLocalSearchParams<{ emergencyId?: string; tripId?: string }>();
  const activeTripId = useAppStore((s) => s.activeTripId) || params.tripId;
  const storeEmergencyId = useAppStore((s) => s.emergencyId);
  const emergencyId = storeEmergencyId || params.emergencyId;
  const [loading, setLoading] = useState(false);
  const [emergency, setEmergency] = useState<any | null>(null);
  const [hospitalTitle, setHospitalTitle] = useState("Designated Hospital — ER");
  const [vitalsSent, setVitalsSent] = useState(false);
  const [pulse, setPulse] = useState('86');
  const [spO2, setSpO2] = useState('98');
  const [bp, setBp] = useState('120/80');
  const [bloodSugar, setBloodSugar] = useState('110');

  const adjustPulse = (delta: number) => {
    setPulse((p) => String(Math.max(30, Math.min(220, (parseInt(p) || 80) + delta))));
    setVitalsSent(false);
  };
  const adjustSpO2 = (delta: number) => {
    setSpO2((s) => String(Math.max(50, Math.min(100, (parseInt(s) || 98) + delta))));
    setVitalsSent(false);
  };
  const adjustSugar = (delta: number) => {
    setBloodSugar((s) => String(Math.max(30, Math.min(500, (parseInt(s) || 110) + delta))));
    setVitalsSent(false);
  };

  useEffect(() => {
    if (params.tripId && !useAppStore.getState().activeTripId) {
      useAppStore.getState().setActiveTripId(params.tripId);
    }
    if (params.emergencyId && !useAppStore.getState().emergencyId) {
      useAppStore.getState().setEmergencyId(params.emergencyId);
    }
  }, [params.tripId, params.emergencyId]);

  const fetchEmergency = useCallback(async () => {
    const id = emergencyId || useAppStore.getState().emergencyId || params.emergencyId;
    if (!id) return;
    try {
      const em: any = await api.emergencies.getById(id);
      if (em) {
        setEmergency(em);
        if (em.assignedHospitalName) {
          setHospitalTitle(em.assignedHospitalName);
        } else if (em?.aiResult?.recommendedHospital) {
          setHospitalTitle(em.aiResult.recommendedHospital);
        }
        const st = String(em.status || '').toUpperCase();
        const tripSt = String(em.tripStatus || '').toUpperCase();
        if (st === 'COMPLETED' || tripSt === 'COMPLETED') {
          useAppStore.getState().setActiveTripId(null);
          useAppStore.getState().setEmergencyId(null);
          Alert.alert('Mission Completed', 'The hospital has completed admission for this patient.');
          router.replace('/(ambulance)/dashboard');
          return;
        }
        if (st === 'PATIENT_ARRIVED' || tripSt === 'AT_HOSPITAL') {
          router.replace({
            pathname: '/(ambulance)/hospital-arrival',
            params: { emergencyId: id, tripId: activeTripId || params.tripId },
          });
          return;
        }
      }
    } catch {}
  }, [emergencyId, params.emergencyId, activeTripId, params.tripId]);

  useEffect(() => {
    const effectiveTripId = activeTripId || params.tripId;
    if (effectiveTripId) {
      // Transition trip to EN_ROUTE_TO_HOSPITAL
      api.ambulances.startToHospital(effectiveTripId).catch(() => {});
    }

    fetchEmergency();
    const interval = setInterval(fetchEmergency, 3000);
    return () => clearInterval(interval);
  }, [activeTripId, params.tripId, fetchEmergency]);

  // Live ambulance driver GPS tracking stream to hospital
  useEffect(() => {
    let sub: any = null;
    let isMounted = true;

    watchDeviceLocation((loc) => {
      if (!isMounted) return;
      useAppStore.getState().setLastKnownLocation(loc);
      if (emergencyId) {
        api.emergencies.update(emergencyId, {
          ambulanceLocation: loc,
        }).catch(() => {});
      }
    }).then((s) => {
      sub = s;
    }).catch(() => {});

    return () => {
      isMounted = false;
      if (sub?.remove) sub.remove();
    };
  }, [emergencyId]);

  const handleArrival = async () => {
    if (activeTripId) {
      setLoading(true);
      try {
        await api.ambulances.arrivedHospital(activeTripId);
      } catch (_err) {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    router.push('/(ambulance)/hospital-arrival');
  };

  const handleTransmitVitals = async () => {
    if (emergencyId) {
      try {
        await api.emergencies.update(emergencyId, {
          vitals: {
            pulse: Number(pulse) || 86,
            spO2: Number(spO2) || 98,
            bp: bp || '120/80',
            bloodSugar: Number(bloodSugar) || 110,
          },
        });
        setVitalsSent(true);
        Alert.alert('Vitals Transmitted', `Patient vitals (BP ${bp}, Sugar ${bloodSugar} mg/dL, Pulse ${pulse} bpm, SpO2 ${spO2}%) successfully streamed to Hospital ER Desk.`);
      } catch (_e) {
        setVitalsSent(true);
      }
    }
  };

  const patientName = emergency?.patientName || 'Patient Onboard';
  const patientPhone = emergency?.patientPhone || (emergency as any)?.contactPhone || (emergency as any)?.userPhone || (emergency as any)?.phone;
  const hospitalPhone = (emergency as any)?.assignedHospitalPhone || (emergency as any)?.hospitalPhone || '108';
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const hLat = (emergency as any)?.assignedHospitalLocation?.latitude ?? (lastKnownLocation?.latitude ? lastKnownLocation.latitude + 0.012 : 25.4358);
  const hLng = (emergency as any)?.assignedHospitalLocation?.longitude ?? (lastKnownLocation?.longitude ? lastKnownLocation.longitude + 0.009 : 81.8463);

  return (
    <Screen>
      <TopBar title="📡 Transit to Hospital" back={false} />

      <Card style={styles.card}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="hospital" size={24} color={colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{hospitalTitle}</Text>
            <Text style={styles.sub}>Direct Priority Route · Trauma Bay Alerted</Text>
          </View>
          <Pill color="red">CODE RED</Pill>
        </View>

        {/* Dual Navigation Buttons to Hospital ER Gate */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.gMapsDriveBtn, { flex: 1, backgroundColor: '#1E293B', marginTop: 0 }]}
            onPress={() =>
              openExternalMapPreview({
                lat: hLat,
                lng: hLng,
                title: hospitalTitle,
                originLat: lastKnownLocation?.latitude,
                originLng: lastKnownLocation?.longitude,
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.gMapsDriveText}>🗺️ View in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gMapsDriveBtn, { flex: 1, backgroundColor: colors.red, marginTop: 0 }]}
            onPress={() =>
              openExternalVoiceNavigation({
                destLat: hLat,
                destLng: hLng,
                destTitle: hospitalTitle,
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.gMapsDriveText}>🎙️ Voice GPS</Text>
          </TouchableOpacity>
        </View>

        {/* 3-Way Direct Contact Row */}
        <View style={styles.contactRow}>
          {hospitalPhone ? (
            <TouchableOpacity
              style={styles.callHospBtn}
              onPress={() => Linking.openURL(`tel:${hospitalPhone}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.callHospText}>🏥 Call Trauma Desk</Text>
            </TouchableOpacity>
          ) : null}

          {patientPhone ? (
            <TouchableOpacity
              style={styles.callPatientBtn}
              onPress={() => Linking.openURL(`tel:${patientPhone}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.callPatientText}>📞 Call Family/Contact</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Card>

      {/* Onboard Patient Vitals Live Sync Card */}
      <Card style={styles.patientCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.patientSub}>Patient vitals stabilized · In active transport</Text>
          </View>
          <Pill color="success">ONBOARD</Pill>
        </View>

        {/* Vitals Telemetry Row - Pulse, SpO2, Sugar, BP */}
        <View style={styles.vitalsGrid}>
          {/* Pulse */}
          <View style={styles.vitalBoxInteractive}>
            <Text style={styles.vitalLabel}>PULSE (BPM)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustPulse(-2)} activeOpacity={0.7}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.vitalInput}
                keyboardType="numeric"
                value={pulse}
                onChangeText={(v) => { setPulse(v); setVitalsSent(false); }}
              />
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustPulse(2)} activeOpacity={0.7}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SpO2 */}
          <View style={styles.vitalBoxInteractive}>
            <Text style={styles.vitalLabel}>SpO2 (%)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustSpO2(-1)} activeOpacity={0.7}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.vitalInput}
                keyboardType="numeric"
                value={spO2}
                onChangeText={(v) => { setSpO2(v); setVitalsSent(false); }}
              />
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustSpO2(1)} activeOpacity={0.7}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.vitalsGrid, { marginTop: 8 }]}>
          {/* Blood Sugar */}
          <View style={styles.vitalBoxInteractive}>
            <Text style={styles.vitalLabel}>SUGAR (MG/DL)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustSugar(-5)} activeOpacity={0.7}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.vitalInput}
                keyboardType="numeric"
                value={bloodSugar}
                onChangeText={(v) => { setBloodSugar(v); setVitalsSent(false); }}
              />
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustSugar(5)} activeOpacity={0.7}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Blood Pressure (BP) */}
          <View style={styles.vitalBoxInteractive}>
            <Text style={styles.vitalLabel}>BP (SYS/DIA)</Text>
            <TextInput
              style={[styles.vitalInput, { width: '100%', marginTop: 2 }]}
              value={bp}
              onChangeText={(v) => { setBp(v); setVitalsSent(false); }}
              placeholder="120/80"
            />
          </View>
        </View>

        {/* Quick BP Presets */}
        <View style={styles.bpPresetRow}>
          <Text style={{ fontSize: 10, color: colors.inkFaint, fontWeight: '700' }}>BP Presets:</Text>
          {['110/70', '120/80', '140/90', '160/100'].map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.presetChip, bp === preset && styles.presetChipActive]}
              onPress={() => { setBp(preset); setVitalsSent(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetChipText, bp === preset && styles.presetChipTextActive]}>
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.syncVitalsBtn, vitalsSent && { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}
          onPress={handleTransmitVitals}
          activeOpacity={0.8}
        >
          <Text style={[styles.syncVitalsText, vitalsSent && { color: colors.success }]}>
            {vitalsSent ? '✓ Vitals Streamed to ER Desk' : '📡 Transmit Vitals to Trauma Desk'}
          </Text>
        </TouchableOpacity>
      </Card>

      <Banner color="success" icon={<Icon name="check" size={14} color={colors.success} />}>
        Emergency ER Desk notified — Trauma team ready for patient arrival.
      </Banner>

      <View style={{ height: 20 }} />

      <Button
        title={loading ? 'Updating Arrival...' : 'Arrived at Hospital → Handover'}
        disabled={loading}
        loading={loading}
        onPress={handleArrival}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.line },
  name: { fontWeight: '700', fontSize: 15, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  callHospBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callHospText: { fontSize: 12, fontWeight: '700', color: colors.blue },
  callPatientBtn: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPatientText: { fontSize: 12, fontWeight: '700', color: colors.success },
  patientCard: { padding: 14, marginBottom: 14, backgroundColor: '#F8FAFC' },
  patientName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  patientSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  gMapsDriveBtn: {
    backgroundColor: '#15803D',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  gMapsDriveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12.5,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  vitalBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.inkFaint,
    letterSpacing: 0.5,
  },
  vitalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 2,
  },
  syncVitalsBtn: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncVitalsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.blue,
  },
  vitalsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  vitalBoxInteractive: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 18,
  },
  vitalInput: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  bpPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.red,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  presetChipTextActive: {
    color: colors.red,
  },
});

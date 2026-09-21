import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, Card, Pill, Stepper, Banner, Icon, HTitle, openExternalMapPreview } from '@/components/ui';
import { AMB_STEPS } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

const BACKEND_STEP_MAP: Record<string, number> = {
  REPORTED: 0,
  CONFIRMING: 0,
  HOSPITAL_SEARCH: 0,
  HOSPITAL_PENDING: 0,
  PENDING: 0,
  HOSPITAL_ACCEPTED: 1,
  ASSIGNED: 2,
  AMBULANCE_ASSIGNED: 2,
  EN_ROUTE_TO_PATIENT: 3,
  EN_ROUTE: 3,
  ARRIVING: 4,
  AT_PATIENT: 4,
  PATIENT_ONBOARD: 5,
  EN_ROUTE_TO_HOSPITAL: 6,
  AT_HOSPITAL: 7,
  PATIENT_ARRIVED: 7,
  TREATMENT: 7,
  COMPLETED: 7,
};

const STEP_TO_BACKEND: string[] = [
  'REPORTED',
  'HOSPITAL_ACCEPTED',
  'AMBULANCE_ASSIGNED',
  'EN_ROUTE_TO_PATIENT',
  'ARRIVING',
  'PATIENT_ONBOARD',
  'EN_ROUTE_TO_HOSPITAL',
  'COMPLETED',
];

export default function Active() {
  const ambStatus = useAppStore((s) => s.ambStatus);
  const setAmbStatus = useAppStore((s) => s.setAmbStatus);
  const emergencyId = useAppStore((s) => s.emergencyId);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const [emergency, setEmergency] = useState<any | null>(null);
  const step = AMB_STEPS[ambStatus] || AMB_STEPS[0];
  const elapsed = 2 + ambStatus * 3;
  const isLast = ambStatus >= AMB_STEPS.length - 1;

  useEffect(() => {
    // Stop polling if no emergencyId or if already completed
    if (!emergencyId || ambStatus >= AMB_STEPS.length - 1) return;

    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const emg = await api.emergencies.getById(emergencyId);
        if (mounted && emg) {
          setEmergency(emg);
          const statusKey = String(emg.tripStatus || emg.status || '').toUpperCase();
          const stepIndex = BACKEND_STEP_MAP[statusKey] ?? BACKEND_STEP_MAP[String(emg.status || '').toUpperCase()];
          if (stepIndex !== undefined && stepIndex !== ambStatus) {
            setAmbStatus(stepIndex);
            if (stepIndex >= AMB_STEPS.length - 1 || emg.status === 'COMPLETED') {
              if (timer) clearInterval(timer);
            }
          }
        }
      } catch (_err) {
        // Offline demo fallback preserves current state
      }
    };

    poll();
    timer = setInterval(poll, 3500);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [emergencyId, ambStatus]);

  const handleAdvance = async () => {
    const next = Math.min(ambStatus + 1, AMB_STEPS.length - 1);
    setAmbStatus(next);

    if (emergencyId) {
      try {
        const nextStatus = STEP_TO_BACKEND[next];
        await api.emergencies.update(emergencyId, { status: nextStatus });
      } catch (_err) {
        // Handled in demo mode
      }
    }
  };

  const hasHospitalAccepted = ambStatus >= 1 || !!emergency?.assignedHospitalName;
  const hasAmbulanceAssigned =
    ambStatus >= 2 ||
    !!emergency?.assignedDriverName ||
    (!!emergency?.assignedAmbulanceId && emergency?.assignedAmbulanceId !== 'Unit Dispatching');

  const hospitalName = hasHospitalAccepted
    ? emergency?.assignedHospitalName || 'Emergency ER Hospital'
    : 'Alerting Hospitals...';
  const hospitalSub = hasHospitalAccepted
    ? 'Trauma Desk Standing By'
    : 'Broadcasting emergency to nearest ERs';
  const hospitalPhone = hasHospitalAccepted ? emergency?.assignedHospitalPhone : null;

  const ambulancePlate = hasAmbulanceAssigned
    ? emergency?.assignedAmbulanceId || 'Unit Dispatched'
    : ambStatus === 1
    ? 'Dispatching Unit...'
    : 'Ambulance Standby';
  const ambulanceSub = hasAmbulanceAssigned
    ? `Pilot: ${emergency?.assignedDriverName || 'Rescue Pilot'}`
    : ambStatus === 1
    ? 'Hospital assigning nearest ambulance'
    : 'Awaiting hospital assignment';
  const driverPhone = hasAmbulanceAssigned ? emergency?.assignedDriverPhone : null;

  const etaText =
    ambStatus === 0
      ? 'Awaiting ER hospital acceptance'
      : ambStatus === 1
      ? 'Dispatching ambulance unit'
      : !isLast
      ? '4 min'
      : '—';

  return (
    <Screen>
      <View style={styles.topRow}>
        <Pill color="red">{ambStatus === 0 ? 'ALERT BROADCASTED' : 'EMERGENCY ACTIVE'}</Pill>
        <Text style={styles.elapsed}>{elapsed} min elapsed</Text>
      </View>
      <Card style={styles.statusCard}>
        <Text style={styles.statusLabel}>CURRENT STATUS</Text>
        <HTitle size={17}>{step}</HTitle>
        <Text style={styles.eta}>ETA to next step: {etaText}</Text>
      </Card>
      <Card style={styles.stepperCard}>
        <Stepper steps={AMB_STEPS} currentIndex={ambStatus} />
      </Card>

      {/* Real Assigned Ambulance & Hospital Cards */}
      <View style={styles.pairRow}>
        <Card style={styles.pairCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="ambulance" size={18} color={hasAmbulanceAssigned ? colors.red : colors.inkFaint} />
            <Text style={styles.pairTitle} numberOfLines={1}>
              {ambulancePlate}
            </Text>
          </View>
          <Text style={styles.pairSub} numberOfLines={1}>
            {ambulanceSub}
          </Text>
          {driverPhone ? (
            <TouchableOpacity
              style={styles.pairCallBtn}
              onPress={() => Linking.openURL(`tel:${driverPhone}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.pairCallText}>📞 Call Pilot</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        <Card style={styles.pairCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="hospital" size={18} color={hasHospitalAccepted ? colors.blue : colors.inkFaint} />
            <Text style={styles.pairTitle} numberOfLines={1}>
              {hospitalName}
            </Text>
          </View>
          <Text style={styles.pairSub} numberOfLines={1}>
            {hospitalSub}
          </Text>
          {hospitalPhone ? (
            <TouchableOpacity
              style={styles.pairCallBtn}
              onPress={() => Linking.openURL(`tel:${hospitalPhone}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.pairCallText}>📞 Call Hospital</Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      </View>

      {/* Transit First Aid Micro-Guidance (Interactive AI) */}
      <TouchableOpacity
        style={styles.firstAidBox}
        onPress={() => router.push('/(patient)/emergency/ai-actions')}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.firstAidTag}>🤖 AI FIRST-AID GUIDANCE (DO'S & DON'TS)</Text>
          <Text style={{ fontSize: 11, color: colors.redDark, fontWeight: '700' }}>Open ➔</Text>
        </View>
        <Text style={styles.firstAidText}>
          Keep patient calm and stationary. Tap here to view AI-guided emergency first-aid instructions while waiting.
        </Text>
      </TouchableOpacity>

      <Banner color="success" icon={<Icon name="check" size={14} color={colors.success} />}>
        Emergency contacts and hospital ER desk are receiving live location telemetry.
      </Banner>

      <View style={{ height: 14 }} />

      {/* View Ambulance & Route in Maps (Preview Mode, No Auto-Voice) */}
      <TouchableOpacity
        style={styles.gMapsBtn}
        onPress={() => {
          const ambLat = emergency?.ambulanceLocation?.latitude ?? (emergency as any)?.assignedHospitalLocation?.latitude;
          const ambLng = emergency?.ambulanceLocation?.longitude ?? (emergency as any)?.assignedHospitalLocation?.longitude;
          const pLat = emergency?.location?.latitude ?? lastKnownLocation?.latitude ?? 12.9716;
          const pLng = emergency?.location?.longitude ?? lastKnownLocation?.longitude ?? 77.5946;

          if (ambLat && ambLng) {
            openExternalMapPreview({
              lat: ambLat,
              lng: ambLng,
              title: emergency?.assignedAmbulanceId ? `Ambulance ${emergency.assignedAmbulanceId}` : 'Rescue Ambulance',
              originLat: pLat,
              originLng: pLng,
            });
          } else {
            router.push(emergencyId ? `/(patient)/live-map?emergencyId=${emergencyId}` : '/(patient)/live-map');
          }
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.gMapsBtnText}>🗺️ View Ambulance on Google Maps</Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          title="Track on Map (Live GPS)"
          variant="secondary"
          onPress={() => router.push(emergencyId ? `/(patient)/live-map?emergencyId=${emergencyId}` : '/(patient)/live-map')}
        />
        {isLast ? (
          <Button title="Complete" onPress={() => router.replace('/(patient)/emergency/completed')} />
        ) : (
          <Button title="Advance Status →" onPress={handleAdvance} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  elapsed: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  statusCard: { padding: 16, marginBottom: 16, alignItems: 'center' },
  statusLabel: { fontSize: 11, color: colors.inkFaint, fontWeight: '700', letterSpacing: 0.5 },
  eta: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  stepperCard: { padding: 16, marginBottom: 16 },
  pairRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pairCard: { flex: 1, padding: 12, gap: 4 },
  pairTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  pairSub: { fontSize: 10.5, color: colors.inkFaint },
  pairCallBtn: {
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairCallText: { fontSize: 11, fontWeight: '700', color: colors.blue },
  firstAidBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  firstAidTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  firstAidText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78350F',
    marginTop: 3,
    lineHeight: 16,
  },
  gMapsBtn: {
    backgroundColor: '#15803D',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
    elevation: 3,
  },
  gMapsBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12.5,
  },
});

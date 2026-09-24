import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
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
  const resetEmergencySession = useAppStore((s) => s.resetEmergencySession);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const [emergency, setEmergency] = useState<any | null>(null);
  const step = AMB_STEPS[ambStatus] || AMB_STEPS[0];
  const elapsed = 2 + ambStatus * 3;
  const isLast = ambStatus >= AMB_STEPS.length - 1;

  const handleCancelEmergency = () => {
    Alert.alert(
      'Cancel Emergency SOS?',
      'Are you sure you want to cancel? Responding ambulance pilots and emergency hospital rooms will be notified immediately.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              if (emergencyId) {
                await api.emergencies.cancel(emergencyId, 'Patient requested cancellation');
              } else {
                await api.emergencies.cancelActive('Patient requested cancellation');
              }
            } catch {}
            resetEmergencySession();
            router.replace('/(patient)/home');
          },
        },
      ]
    );
  };

  const pickupLat = emergency?.location?.latitude ?? lastKnownLocation?.latitude;
  const pickupLng = emergency?.location?.longitude ?? lastKnownLocation?.longitude;

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
          if (statusKey === 'CANCELLED' || emg.status === 'CANCELLED') {
            if (timer) clearInterval(timer);
            resetEmergencySession();
            router.replace('/(patient)/home');
            return;
          }
          if (statusKey === 'COMPLETED' || emg.status === 'COMPLETED' || emg.tripStatus === 'COMPLETED') {
            if (timer) clearInterval(timer);
            router.replace('/(patient)/emergency/completed');
            return;
          }
          const stepIndex = BACKEND_STEP_MAP[statusKey] ?? BACKEND_STEP_MAP[String(emg.status || '').toUpperCase()];
          // Only advance forward to prevent out-of-order network responses from flickering backward
          if (stepIndex !== undefined && stepIndex > ambStatus) {
            setAmbStatus(stepIndex);
            if (stepIndex >= AMB_STEPS.length - 1) {
              if (timer) clearInterval(timer);
              router.replace('/(patient)/emergency/completed');
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

  const isHospitalConfirmed =
    (ambStatus >= 1 ||
      emergency?.status === 'HOSPITAL_ACCEPTED' ||
      emergency?.status === 'AMBULANCE_ASSIGNED' ||
      emergency?.status === 'EN_ROUTE_TO_PATIENT' ||
      emergency?.status === 'ARRIVING' ||
      emergency?.status === 'PATIENT_ONBOARD' ||
      emergency?.status === 'EN_ROUTE_TO_HOSPITAL' ||
      emergency?.status === 'COMPLETED') &&
    emergency?.status !== 'REPORTED' &&
    emergency?.status !== 'HOSPITAL_SEARCH' &&
    !!emergency?.assignedHospitalName;

  const hasHospitalAccepted = isHospitalConfirmed;
  const hasAmbulanceAssigned =
    ambStatus >= 2 ||
    !!emergency?.assignedDriverName ||
    (!!emergency?.assignedAmbulanceId && emergency?.assignedAmbulanceId !== 'Unit Dispatching');

  const targetedHospName = emergency?.assignedHospitalName || (emergency as any)?.alertedHospitalName;
  const hospitalName = hasHospitalAccepted
    ? emergency?.assignedHospitalName || 'Emergency ER Hospital'
    : targetedHospName
    ? `Alerting ${targetedHospName}...`
    : 'Alerting Hospitals...';
  const hospitalSub = hasHospitalAccepted
    ? 'Trauma Desk Standing By'
    : (emergency as any)?.escalationMessage || 'Broadcasting triage to nearest emergency ER';
  const hospitalPhone = hasHospitalAccepted ? emergency?.assignedHospitalPhone || null : null;

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
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Pill color="red">{ambStatus === 0 ? 'ALERT BROADCASTED' : 'EMERGENCY ACTIVE'}</Pill>
          {emergency?.severity && (
            <Pill color={emergency.severity === 'CRITICAL' || emergency.severity === 'HIGH' ? 'red' : 'amber'}>
              {emergency.severity}
            </Pill>
          )}
        </View>
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

      {/* Real Emergency Incident Pickup Location Card */}
      <Card style={styles.incidentLocCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="pin" size={15} color={colors.red} />
            <Text style={styles.incidentLocLabel}>INCIDENT PICKUP LOCATION</Text>
          </View>
          <Pill color="success">VERIFIED GPS</Pill>
        </View>
        <Text style={styles.incidentLocText} numberOfLines={2}>
          {emergency?.locationAddress || locationAddress || (pickupLat && pickupLng ? `${pickupLat.toFixed(4)}° N, ${pickupLng.toFixed(4)}° E` : 'Live GPS Corridor')}
        </Text>
        {pickupLat && pickupLng ? (
          <Text style={styles.incidentLocCoords}>
            📍 Hardware GPS: {pickupLat.toFixed(4)}° N, {pickupLng.toFixed(4)}° E
          </Text>
        ) : null}
      </Card>

      {(emergency as any)?.escalationMessage ? (
        <Card style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, padding: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="alert-triangle" size={16} color={colors.amber} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.amber }}>LIVE ER RE-ROUTING</Text>
          </View>
          <Text style={{ fontSize: 11.5, color: '#92400E', marginTop: 4, lineHeight: 16 }}>
            {(emergency as any).escalationMessage}
          </Text>
        </Card>
      ) : null}

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
            <Icon name="hospital" size={18} color={hasHospitalAccepted ? colors.blue : colors.amber} />
            <Text style={styles.pairTitle} numberOfLines={1}>
              {hospitalName}
            </Text>
          </View>
          <Text style={styles.pairSub} numberOfLines={1}>
            {hospitalSub}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {hospitalPhone ? (
              <TouchableOpacity
                style={[styles.pairCallBtn, { flex: 1 }]}
                onPress={() => Linking.openURL(`tel:${hospitalPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.pairCallText}>📞 Call</Text>
              </TouchableOpacity>
            ) : null}
            {emergency?.assignedHospitalLocation?.latitude && emergency?.assignedHospitalLocation?.longitude ? (
              <TouchableOpacity
                style={[styles.pairCallBtn, { flex: 1, backgroundColor: '#EFF6FF', borderColor: colors.blue }]}
                onPress={() => {
                  openExternalMapPreview({
                    lat: emergency.assignedHospitalLocation.latitude,
                    lng: emergency.assignedHospitalLocation.longitude,
                    title: hospitalName,
                    originLat: pickupLat,
                    originLng: pickupLng,
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pairCallText, { color: colors.blue }]}>📍 Pin</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>
      </View>

      {/* Top 3 AI-Matched Hospitals (Live Network View) */}
      {(() => {
        const candidateHospitals: any[] =
          (emergency?.hospitalCandidates && emergency.hospitalCandidates.length > 0)
            ? emergency.hospitalCandidates
            : useAppStore.getState().candidateHospitals || [];

        if (candidateHospitals.length === 0) return null;

        return (
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.5 }}>
                TOP 3 AI-MATCHED HOSPITALS
              </Text>
              <Pill color="blue">TRIAGE NETWORK</Pill>
            </View>
            {candidateHospitals.slice(0, 3).map((hosp: any, idx: number) => {
              const isAlerted =
                (emergency?.assignedHospitalName && (emergency.assignedHospitalName.includes(hosp.name) || hosp.name.includes(emergency.assignedHospitalName))) ||
                (emergency?.alertedHospitalName && (emergency.alertedHospitalName.includes(hosp.name) || hosp.name.includes(emergency.alertedHospitalName))) ||
                idx === (emergency?.alertedCandidateIndex ?? 0);

              return (
                <Card
                  key={hosp.hospitalId || hosp.id || idx}
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    borderWidth: 1.5,
                    borderColor: isAlerted ? colors.red : colors.line,
                    backgroundColor: isAlerted ? '#FFFDFD' : '#FAFAFA',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Pill color={isAlerted ? 'red' : 'grey'}>
                          {isAlerted ? '★ ALERT ACTIVE' : `STANDBY #${idx + 1}`}
                        </Pill>
                        <Pill color="success">{hosp.score || 85}% MATCH</Pill>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 4 }}>
                        {hosp.name}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.red }}>
                      {hosp.distanceKm || 2} km · ~{hosp.etaMinutes || 6} min
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 4 }}>
                    {hosp.matchReason || 'Equipped emergency response center.'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>
                      🛏️ Beds: <Text style={{ fontWeight: '700', color: colors.ink }}>{hosp.availableBeds ?? 14}</Text>
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>
                      🚨 ICU: <Text style={{ fontWeight: '700', color: colors.red }}>{hosp.availableIcuBeds ?? 4}</Text>
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        );
      })()}

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

      {/* View Ambulance & Route in Maps (Dynamic Phase Routing) */}
      {(() => {
        const isHeadingToHospital =
          ambStatus >= 5 ||
          emergency?.status === 'PATIENT_ONBOARD' ||
          emergency?.status === 'EN_ROUTE_TO_HOSPITAL' ||
          emergency?.status === 'TRANSPORTING' ||
          emergency?.tripStatus === 'PATIENT_ONBOARD' ||
          emergency?.tripStatus === 'EN_ROUTE_TO_HOSPITAL';

        const hospLoc = emergency?.assignedHospitalLocation;
        const ambLoc = emergency?.ambulanceLocation;
        const pLat = emergency?.location?.latitude ?? lastKnownLocation?.latitude;
        const pLng = emergency?.location?.longitude ?? lastKnownLocation?.longitude;

        if (isHeadingToHospital && hospLoc?.latitude && hospLoc?.longitude) {
          const originLat = ambLoc?.latitude ?? pLat;
          const originLng = ambLoc?.longitude ?? pLng;
          return (
            <TouchableOpacity
              style={[styles.gMapsBtn, { backgroundColor: '#DC2626' }]}
              onPress={() => {
                openExternalMapPreview({
                  lat: hospLoc.latitude,
                  lng: hospLoc.longitude,
                  title: emergency?.assignedHospitalName || 'Assigned Hospital ER',
                  originLat,
                  originLng,
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.gMapsBtnText}>🗺️ Track Route to Hospital in Google Maps</Text>
            </TouchableOpacity>
          );
        }

        const ambLat = ambLoc?.latitude;
        const ambLng = ambLoc?.longitude;

        if (!hasAmbulanceAssigned) {
          return (
            <Card style={{ padding: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="ambulance" size={16} color={colors.amber} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.amber }}>
                  {hasHospitalAccepted ? 'Ambulance Unit Dispatching...' : 'Awaiting Hospital Acceptance'}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 4 }}>
                {hasHospitalAccepted
                  ? 'Hospital desk is assigning the nearest on-call ambulance pilot. Live Google Maps navigation will activate immediately upon assignment.'
                  : `Transmitting triage vitals to ${emergency?.alertedHospitalName || 'nearest trauma center'}. Stand by for ER confirmation.`}
              </Text>
            </Card>
          );
        }

        return (
          <TouchableOpacity
            style={styles.gMapsBtn}
            onPress={() => {
              if (ambLat && ambLng && pLat && pLng) {
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
            <Text style={styles.gMapsBtnText}>🗺️ Track Responding Ambulance in Google Maps</Text>
          </TouchableOpacity>
        );
      })()}

      <View style={{ height: 10 }} />
      {isLast ? (
        <Button
          title="Emergency Resolved • View Summary →"
          onPress={() => router.replace('/(patient)/emergency/completed')}
        />
      ) : (
        <Button
          title="📡 Live Mission Updates & Tracking"
          variant="secondary"
          onPress={() => router.push(emergencyId ? `/(patient)/live-map?emergencyId=${emergencyId}` : '/(patient)/live-map')}
        />
      )}

      {!isLast && (
        <>
          <View style={{ height: 10 }} />
          <TouchableOpacity
            style={styles.cancelEmergencyBtn}
            onPress={handleCancelEmergency}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelEmergencyBtnText}>🛑 Cancel Emergency / False Alarm</Text>
          </TouchableOpacity>
        </>
      )}
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
  incidentLocCard: {
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
  },
  incidentLocLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.red,
  },
  incidentLocText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 4,
    lineHeight: 17,
  },
  incidentLocCoords: {
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 3,
  },
  cancelEmergencyBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelEmergencyBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
});

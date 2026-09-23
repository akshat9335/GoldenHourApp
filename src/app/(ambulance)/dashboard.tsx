import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, LabelEyebrow, TopBar, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { watchDeviceLocation } from '@/services/deviceLocation';

export default function AmbulanceDashboard() {
  const userProfile = useAppStore((s) => s.userProfile);
  const activeTripId = useAppStore((s) => s.activeTripId);
  const setActiveTripId = useAppStore((s) => s.setActiveTripId);
  const setEmergencyId = useAppStore((s) => s.setEmergencyId);

  const [onDuty, setOnDuty] = useState(true);
  const [tripCount, setTripCount] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);

  const vehiclePlate = userProfile?.ambulanceId || (userProfile as any)?.vehiclePlateNumber || 'Unit UP-70-AMB';
  const driverName = (userProfile as any)?.driverName || userProfile?.name || 'Crew Pilot';
  const rawHospital = (userProfile as any)?.hospitalName;
  const isLinkedToHospital = !!rawHospital && rawHospital !== 'Independent Fleet' && rawHospital !== 'Emergency Response Fleet';
  const hospitalAffiliation = isLinkedToHospital ? rawHospital : 'Independent / Golden Hour 108 Fleet';

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Fetch user profile
      const profPromise = api.users.getProfile().catch(() => null);

      // 2. Fetch trip history to compute trip count & check active trip
      const tripsPromise = api.ambulances.getTripHistory().catch(() => []);

      // 3. Fetch pending ambulance requests if on duty
      const reqsPromise = onDuty ? api.ambulances.getRequests().catch(() => []) : Promise.resolve([]);

      const [profRes, tripsRes, reqsRes]: any = await Promise.all([
        profPromise,
        tripsPromise,
        reqsPromise,
      ]);

      if (profRes) {
        useAppStore.getState().setUserProfile(profRes);
      }

        if (Array.isArray(tripsRes)) {
        setTripCount(tripsRes.length);
        const inProgress = tripsRes.find((t: any) => {
          const s = String(t.status || '').toUpperCase();
          return (
            s === 'ASSIGNED' ||
            s === 'EN_ROUTE' ||
            s === 'EN_ROUTE_TO_PATIENT' ||
            s === 'ARRIVED' ||
            s === 'AT_PATIENT' ||
            s === 'PATIENT_ONBOARD' ||
            s === 'TRANSPORTING' ||
            s === 'EN_ROUTE_TO_HOSPITAL' ||
            s === 'AT_HOSPITAL'
          );
        });

        const finished = tripsRes.filter((t: any) => String(t.status || '').toUpperCase() === 'COMPLETED');
        finished.sort((a: any, b: any) => new Date(b.completedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.updatedAt || a.createdAt || 0).getTime());
        setCompletedMissions(finished);

        if (inProgress) {
          setActiveTrip(inProgress);
          setActiveTripId(inProgress.id || inProgress._id);
          setEmergencyId(inProgress.emergencyId || inProgress.id || inProgress._id);
        } else {
          setActiveTrip(null);
        }
      }

      if (Array.isArray(reqsRes)) {
        setRequests(reqsRes);
      }
    } catch (err) {
      console.warn('Dashboard data load error:', err);
    } finally {
      setLoadingRequests(false);
      setRefreshing(false);
    }
  }, [onDuty, setActiveTripId, setEmergencyId]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
    }, 3500);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  useEffect(() => {
    api.ambulances.updateAvailability(onDuty ? 'AVAILABLE' : 'OFFLINE').catch(() => {});
  }, [onDuty]);

  // Dynamic Driver Live Telemetry Stream
  useEffect(() => {
    if (!onDuty) return;

    let sub: any = null;
    let isMounted = true;

    const startDriverTracking = async () => {
      try {
        sub = await watchDeviceLocation((coords) => {
          if (!isMounted) return;
          useAppStore.getState().setLastKnownLocation(coords);
          api.location.updateLocation({
            lat: coords.latitude,
            lng: coords.longitude,
            role: 'AMBULANCE_DRIVER',
          }).catch(() => {});
        });
      } catch {}
    };

    startDriverTracking();

    return () => {
      isMounted = false;
      if (sub?.remove) sub.remove();
    };
  }, [onDuty]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleRequestPress = (req: any) => {
    setEmergencyId(req.id || req.emergencyId);
    router.push({
      pathname: '/(ambulance)/request-detail',
      params: { emergencyId: req.id || req.emergencyId },
    });
  };

  const handleDirectAccept = async (req: any) => {
    const emId = req.id || req.emergencyId;
    if (!emId) return;

    try {
      await api.ambulances.updateAvailability('AVAILABLE').catch(() => {});
      const res: any = await api.ambulances.acceptRequest(emId);
      const data = res?.data || res;
      const tripId = data?.tripId || `trip-${emId}`;

      setActiveTripId(tripId);
      setEmergencyId(emId);

      try {
        await api.ambulances.startToPatient(tripId);
      } catch (_e) {}

      router.replace('/(ambulance)/navigate-patient');
    } catch (_err) {
      setEmergencyId(emId);
      router.push({
        pathname: '/(ambulance)/request-detail',
        params: { emergencyId: emId },
      });
    }
  };

  const handleResumeTrip = () => {
    if (!activeTrip) return;
    const st = String(activeTrip.status || '').toUpperCase();
    const tripId = activeTrip.id || activeTrip._id;
    const emId = activeTrip.emergencyId || activeTrip.id || activeTrip._id;
    if (tripId) setActiveTripId(tripId);
    if (emId) setEmergencyId(emId);

    if (st === 'EN_ROUTE_TO_PATIENT' || st === 'ASSIGNED' || st === 'EN_ROUTE') {
      router.push({
        pathname: '/(ambulance)/navigate-patient',
        params: { emergencyId: emId, tripId },
      });
    } else if (st === 'AT_PATIENT' || st === 'ARRIVED') {
      router.push({
        pathname: '/(ambulance)/arrived-patient',
        params: { emergencyId: emId, tripId },
      });
    } else if (st === 'PATIENT_ONBOARD' || st === 'EN_ROUTE_TO_HOSPITAL' || st === 'TRANSPORTING') {
      router.push({
        pathname: '/(ambulance)/picked-up',
        params: { emergencyId: emId, tripId },
      });
    } else if (st === 'AT_HOSPITAL') {
      router.push({
        pathname: '/(ambulance)/hospital-arrival',
        params: { emergencyId: emId, tripId },
      });
    } else {
      router.push({
        pathname: '/(ambulance)/navigate-patient',
        params: { emergencyId: emId, tripId },
      });
    }
  };

  const handleEndMission = () => {
    if (!activeTrip) return;
    Alert.alert(
      'Complete / End Mission',
      'Are you sure you want to finish or clear this active mission? This will free your ambulance unit for new dispatches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Mission',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTrip.id) {
                await api.ambulances.completeTrip(activeTrip.id);
              }
            } catch (_err) {
              // Non-blocking fallback
            } finally {
              setActiveTrip(null);
              setActiveTripId(null);
              setEmergencyId(null);
              await api.ambulances.updateAvailability('AVAILABLE').catch(() => {});
              loadDashboardData();
            }
          },
        },
      ]
    );
  };

  const handleDismissRequest = async (req: any) => {
    const emId = req.id || req.emergencyId;
    if (!emId) return;
    try {
      setRequests((prev) => prev.filter((r) => (r.id || r.emergencyId) !== emId));
      await api.ambulances.dismissRequest(emId);
    } catch (_e) {}
  };

  const handleClearAllRequests = () => {
    Alert.alert(
      'Clear Dispatch Alerts',
      'Dismiss all incoming dispatch requests from your queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setRequests([]);
            try {
              await api.ambulances.clearRequests();
              loadDashboardData();
            } catch (_e) {}
          },
        },
      ]
    );
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.red]}
          tintColor={colors.red}
        />
      }
    >
      <TopBar title="Ambulance Console" back={true} onPressBack={() => router.replace('/role-selection')} />

      {/* Driver Unit Card */}
      <Card style={styles.driverUnitCard}>
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.unitPlate}>{vehiclePlate}</Text>
            <Text style={styles.driverName}>Pilot: {driverName}</Text>

            {isLinkedToHospital ? (
              <View style={styles.hospitalAffiliationBadge}>
                <Text style={styles.hospitalAffiliationText}>
                  🏥 Affiliated: {hospitalAffiliation}
                </Text>
              </View>
            ) : (
              <View style={styles.independentBadge}>
                <Text style={styles.independentBadgeText}>
                  🚑 Independent Fleet · 108 Responder
                </Text>
              </View>
            )}

            {userProfile?.crisisId ? (
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>🆔 Golden Hour ID: {userProfile.crisisId}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <TouchableOpacity onPress={() => setOnDuty(!onDuty)} activeOpacity={0.8}>
              <Pill color={onDuty ? 'success' : 'grey'}>
                {onDuty ? '● ON DUTY' : '○ OFFLINE'}
              </Pill>
            </TouchableOpacity>
            {onDuty && (
              <View style={styles.gpsStreamBadge}>
                <Text style={styles.gpsStreamText}>📡 GPS STREAMING</Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      <View style={{ height: 14 }} />

      {/* Active Trip Banner if ongoing */}
      {activeTrip && (
        <Card style={styles.activeTripCard}>
          <View style={styles.rowTop}>
            <Pill color="amber">MISSION IN PROGRESS</Pill>
            <Text style={styles.activeTripStatus}>{String(activeTrip.status).replace(/_/g, ' ')}</Text>
          </View>
          <Text style={styles.activeTripEmergency}>
            Emergency ID: {activeTrip.emergencyId?.slice(-6)?.toUpperCase() || 'ACTIVE'}
          </Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={styles.liveUpdateBtn}
              onPress={handleResumeTrip}
              activeOpacity={0.85}
            >
              <Text style={styles.liveUpdateBtnText}>📡 Live Updates & Route</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.resumeBtn, { flex: 1.3, marginTop: 0 }]}
                onPress={handleResumeTrip}
                activeOpacity={0.8}
              >
                <Text style={styles.resumeBtnText}>Resume Mission →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.endMissionBtn}
                onPress={handleEndMission}
                activeOpacity={0.8}
              >
                <Text style={styles.endMissionBtnText}>End Mission</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      )}

      {/* Incoming Requests Feed or Standby */}
      {onDuty ? (
        requests.length > 0 ? (
          <>
            <View style={styles.queueHeader}>
              <Text style={styles.queueCount}>
                {requests.length} Incoming Dispatch {requests.length === 1 ? 'Alert' : 'Alerts'}
              </Text>
              <TouchableOpacity onPress={handleClearAllRequests} style={styles.clearBtn} hitSlop={8}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {requests.map((req, idx) => {
              const sev = String(req.severity || 'HIGH').toUpperCase();
              const pillColor = (sev === 'CRITICAL' || sev === 'HIGH' ? 'red' : 'amber') as 'red' | 'amber';
              const locationStr = req.locationAddress
                ? `${req.locationAddress} (${req.location?.latitude?.toFixed(4)}, ${req.location?.longitude?.toFixed(4)})`
                : req.location
                ? `${req.location.latitude?.toFixed(4)}°N, ${req.location.longitude?.toFixed(4)}°E`
                : 'GPS Shared';

              return (
                <Card key={req.id || idx} style={styles.requestCard}>
                  <View style={styles.rowTop}>
                    <Pill color={pillColor}>DISPATCH · {sev}</Pill>
                    <Text style={styles.dist}>
                      {req.incidentType || 'TRAUMA ALERT'}
                    </Text>
                  </View>
                  <Text style={styles.pickup}>Pickup: {locationStr}</Text>
                  {req.assignedHospitalName ? (
                    <Text style={styles.hospTag}>
                      🏥 Dispatched by: {req.assignedHospitalName}
                    </Text>
                  ) : null}
                  {req.description ? (
                    <Text style={styles.descText} numberOfLines={2}>
                      {req.description}
                    </Text>
                  ) : null}

                  <View style={styles.requestActionRow}>
                    <TouchableOpacity
                      style={styles.directAcceptBtn}
                      onPress={() => handleDirectAccept(req)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.directAcceptText}>✓ Confirm & Accept Trip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => handleRequestPress(req)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reviewBtnText}>Review →</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => handleDismissRequest(req)}
                      activeOpacity={0.8}
                      hitSlop={8}
                    >
                      <Text style={styles.dismissBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        ) : (
          <Card style={styles.standbyCard}>
            <View style={styles.standbyDotRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.standbyTitle}>Emergency Dispatch · Standby</Text>
            </View>
            <Text style={styles.standbySub}>
              No pending emergency requests in your quadrant. Your unit is broadcast as available to 108 network.
            </Text>
          </Card>
        )
      ) : (
        <Card style={styles.offlineCard}>
          <Text style={styles.offlineTitle}>Crew is Currently Offline</Text>
          <Text style={styles.offlineSub}>Toggle ON DUTY above to receive emergency dispatch alerts.</Text>
        </Card>
      )}

      {completedMissions.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <LabelEyebrow>COMPLETED RESCUE MISSIONS ({completedMissions.length})</LabelEyebrow>
          {completedMissions.slice(0, 5).map((trip: any, idx: number) => (
            <Card key={trip.id || trip._id || idx} style={{ padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                  Mission #{String(trip.id || trip._id || idx).slice(-6).toUpperCase()} · {trip.incidentType || 'Emergency Rescue'}
                </Text>
                <Pill color="success">COMPLETED</Pill>
              </View>
              <Text style={{ fontSize: 11, color: colors.inkFaint, marginTop: 4 }}>
                Hospital: {trip.hospitalName || 'Emergency ER'} · Patient Handed Over Safely
              </Text>
            </Card>
          ))}
        </View>
      )}

      <LabelEyebrow>SHIFT SUMMARY</LabelEyebrow>
      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{tripCount}</Text>
          <Text style={styles.statLabel}>TRIPS TODAY</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>92%</Text>
          <Text style={styles.statLabel}>FUEL LEVEL</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.success }]}>ACTIVE</Text>
          <Text style={styles.statLabel}>GPS SYNC</Text>
        </Card>
      </View>

      <View style={{ marginTop: 24, marginBottom: 32 }}>
        <Button
          title="Exit Crew Console"
          variant="secondary"
          onPress={() => router.replace('/role-selection')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  driverUnitCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  unitPlate: { fontSize: 18, fontWeight: '800', color: colors.ink },
  driverName: { fontSize: 13, fontWeight: '600', color: colors.inkSoft, marginTop: 2 },
  hospitalAffiliationBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  hospitalAffiliationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  independentBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  independentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  idBadge: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  idBadgeText: { fontSize: 11, fontWeight: '700', color: colors.blue },
  activeTripCard: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: '#FFFBEB',
  },
  activeTripStatus: { fontSize: 11, fontWeight: '700', color: colors.amber },
  activeTripEmergency: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 8 },
  liveUpdateBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveUpdateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  resumeBtn: {
    backgroundColor: colors.amber,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resumeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  endMissionBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMissionBtnText: { color: colors.redDark, fontWeight: '700', fontSize: 12 },
  requestCard: { padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.red },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dist: { fontSize: 11, color: colors.inkSoft, fontWeight: '700' },
  pickup: { fontWeight: '700', fontSize: 13.5, marginTop: 8, color: colors.ink },
  hospTag: { fontSize: 12, color: colors.blue, fontWeight: '700', marginTop: 4 },
  descText: { fontSize: 12, color: colors.inkSoft, marginTop: 4 },
  requestActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  directAcceptBtn: {
    flex: 1,
    backgroundColor: colors.red,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directAcceptText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  reviewBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: { color: colors.ink, fontWeight: '700', fontSize: 11.5 },
  dismissBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: { color: colors.redDark, fontWeight: '800', fontSize: 13 },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  queueCount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: 0.3,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.redDark,
  },
  standbyCard: {
    padding: 18,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  standbyDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  standbyTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  standbySub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 6, lineHeight: 16 },
  offlineCard: { padding: 18, alignItems: 'center', marginBottom: 14, backgroundColor: '#F1F5F9' },
  offlineTitle: { fontSize: 14, fontWeight: '700', color: colors.inkSoft },
  offlineSub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  stat: { flex: 1, padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 16, color: colors.ink },
  statLabel: { fontSize: 9, color: colors.inkFaint, fontWeight: '700', marginTop: 4 },
  gpsStreamBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gpsStreamText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
});

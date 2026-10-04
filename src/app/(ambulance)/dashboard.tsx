import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, LabelEyebrow, TopBar, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { authService } from '@/services/auth';
import { watchDeviceLocation } from '@/services/deviceLocation';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function AmbulanceDashboard() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const params = useLocalSearchParams<{ justCompleted?: string }>();

  const userProfile = useAppStore((s) => s.userProfile);
  const activeTripId = useAppStore((s) => s.activeTripId);
  const setActiveTripId = useAppStore((s) => s.setActiveTripId);
  const emergencyId = useAppStore((s) => s.emergencyId);
  const setEmergencyId = useAppStore((s) => s.setEmergencyId);

  const [onDuty, setOnDuty] = useState(true);
  const [tripCount, setTripCount] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'active' | 'history'>('active');

  // Closed/completed trip IDs blacklist to prevent race condition resurrecting stale completed missions
  const closedTripIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (params.justCompleted) {
      closedTripIdsRef.current.add(params.justCompleted);
      setActiveTrip(null);
      setActiveTripId(null);
      setEmergencyId(null);
    }
  }, [params.justCompleted, setActiveTripId, setEmergencyId]);

  const vehiclePlate = userProfile?.ambulanceId || (userProfile as any)?.vehiclePlateNumber || 'Unit UP-70-AMB';
  const driverName = (userProfile as any)?.driverName || userProfile?.name || 'Crew Pilot';
  const rawHospital = (userProfile as any)?.hospitalName;
  const isLinkedToHospital = !!rawHospital && rawHospital !== 'Independent Fleet' && rawHospital !== 'Emergency Response Fleet';
  const hospitalAffiliation = isLinkedToHospital ? rawHospital : 'Independent / Golden Hour 108 Fleet';

  // 1. Fetch static driver profile and completed mission history once on mount / refresh
  const loadDriverProfile = useCallback(async () => {
    try {
      const isDemo = useAppStore.getState().isDemoMode || userProfile?.uid?.includes('demo');
      const profPromise = isDemo ? Promise.resolve(null) : api.users.getProfile().catch(() => null);
      const tripsPromise = api.ambulances.getTripHistory().catch(() => []);
      const [profRes, tripsRes]: any = await Promise.all([profPromise, tripsPromise]);

      if (profRes && !isDemo) {
        useAppStore.getState().setUserProfile(profRes);
      }

      if (Array.isArray(tripsRes)) {
        setTripCount(tripsRes.length);
        const finished = tripsRes.filter((t: any) => String(t.status || '').toUpperCase() === 'COMPLETED');
        finished.sort((a: any, b: any) => new Date(b.completedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.updatedAt || a.createdAt || 0).getTime());
        setCompletedMissions(finished);
      }
    } catch (err) {
      console.warn('Driver profile load error:', err);
    }
  }, []);

  // 2. Poll only pending requests and active in-progress trip
  const pollActiveAndRequests = useCallback(async () => {
    try {
      const reqsPromise = onDuty ? api.ambulances.getRequests().catch(() => []) : Promise.resolve([]);
      const tripsPromise = api.ambulances.getTripHistory().catch(() => []);
      const [reqsRes, tripsRes]: any = await Promise.all([reqsPromise, tripsPromise]);

      if (Array.isArray(tripsRes)) {
        // Sort descending by most recent activity
        const sorted = [...tripsRes].sort((a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
        );

        const inProgress = sorted.find((t: any) => {
          const s = String(t.status || '').toUpperCase();
          const tId = t.id || t._id;
          const emId = t.emergencyId;
          if (closedTripIdsRef.current.has(tId) || closedTripIdsRef.current.has(emId)) {
            return false;
          }
          const ageHours = (Date.now() - new Date(t.createdAt || t.updatedAt || 0).getTime()) / (1000 * 60 * 60);
          if (ageHours > 6) return false;

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

        if (inProgress) {
          setActiveTrip(inProgress);
          setActiveTripId(inProgress.id || inProgress._id);
          setEmergencyId(inProgress.emergencyId || inProgress.id || inProgress._id);
        } else {
          setActiveTrip(null);
          setActiveTripId(null);
          setEmergencyId(null);
        }
      }

      if (Array.isArray(reqsRes)) {
        setRequests(reqsRes);
      }
    } catch (err) {
      console.warn('Dashboard poll error:', err);
    } finally {
      setLoadingRequests(false);
      setRefreshing(false);
    }
  }, [onDuty, setActiveTripId, setEmergencyId]);

  const loadDashboardData = useCallback(() => {
    loadDriverProfile();
    pollActiveAndRequests();
  }, [loadDriverProfile, pollActiveAndRequests]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      pollActiveAndRequests();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadDashboardData, pollActiveAndRequests]);

  useEffect(() => {
    api.ambulances.updateAvailability(onDuty ? 'AVAILABLE' : 'OFFLINE').catch(() => {});
  }, [onDuty]);

  // Dynamic Driver Live Telemetry Stream (throttled to at most once every 8 seconds)
  useEffect(() => {
    if (!onDuty) return;

    let sub: any = null;
    let isMounted = true;
    let lastUploadTime = 0;

    const startDriverTracking = async () => {
      try {
        sub = await watchDeviceLocation((coords) => {
          if (!isMounted) return;
          useAppStore.getState().setLastKnownLocation(coords);
          const now = Date.now();
          if (now - lastUploadTime > 8000) {
            lastUploadTime = now;
            api.location.updateLocation({
              lat: coords.latitude,
              lng: coords.longitude,
              role: 'AMBULANCE_DRIVER',
            }).catch(() => {});
          }
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
    loadDriverProfile();
    pollActiveAndRequests();
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

    const optimisticTripId = req.tripId || `trip-${emId}`;

    // 1. Instant optimistic UI update
    setActiveTripId(optimisticTripId);
    setEmergencyId(emId);
    setActiveTrip({
      id: optimisticTripId,
      emergencyId: emId,
      status: 'EN_ROUTE_TO_PATIENT',
      patientName: req.patientName,
      location: req.location,
    });
    setRequests((prev) => prev.filter((r) => (r.id || r.emergencyId) !== emId));

    // 2. Instant navigation without network stall
    router.replace({
      pathname: '/(ambulance)/navigate-patient',
      params: { emergencyId: emId, tripId: optimisticTripId },
    });

    // 3. Asynchronously confirm on backend
    try {
      await api.ambulances.updateAvailability('AVAILABLE').catch(() => {});
      const res: any = await api.ambulances.acceptRequest(emId);
      const data = res?.data || res;
      const tripId = data?.tripId || optimisticTripId;
      if (tripId && tripId !== optimisticTripId) {
        useAppStore.getState().setActiveTripId(tripId);
      }
      await api.ambulances.startToPatient(tripId).catch(() => {});
    } catch (_err) {
      console.warn('Accept background error:', _err);
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
    const effectiveTripId = activeTrip?.id || (activeTrip as any)?._id || (activeTrip as any)?.tripId || activeTripId;
    const associatedEmgId = activeTrip?.emergencyId || emergencyId;
    if (!effectiveTripId && !activeTrip) return;
    Alert.alert(
      'Complete / Resolve Mission',
      'Select the outcome for this ambulance mission:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Safe Handover (Completed)',
          onPress: async () => {
            if (effectiveTripId) closedTripIdsRef.current.add(effectiveTripId);
            if (associatedEmgId) closedTripIdsRef.current.add(associatedEmgId);
            setActiveTrip(null);
            setActiveTripId(null);
            setEmergencyId(null);
            try {
              if (effectiveTripId) {
                await api.ambulances.completeTrip(effectiveTripId);
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
        {
          text: '🚨 No Patient Found (False Alarm)',
          style: 'destructive',
          onPress: async () => {
            if (effectiveTripId) closedTripIdsRef.current.add(effectiveTripId);
            if (associatedEmgId) closedTripIdsRef.current.add(associatedEmgId);
            setActiveTrip(null);
            setActiveTripId(null);
            setEmergencyId(null);
            try {
              if (effectiveTripId) {
                await api.ambulances.cancelTrip(effectiveTripId, 'Ground responder reported false alarm');
              } else if (associatedEmgId) {
                await api.emergencies.cancel(associatedEmgId, 'Ground responder reported false alarm');
              }
            } catch (_err) {
              // Non-blocking fallback
            } finally {
              setActiveTrip(null);
              setActiveTripId(null);
              setEmergencyId(null);
              await api.ambulances.updateAvailability('AVAILABLE').catch(() => {});
              loadDashboardData();
              Alert.alert('Reported', 'Mission closed. Caller trust score penalized (-20 points).');
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

  const handleAccountOptions = () => {
    Alert.alert(
      driverName,
      'Select an action to switch role or log out of this ambulance pilot console:',
      [
        {
          text: 'Switch Role',
          onPress: () => router.replace('/role-selection'),
        },
        {
          text: 'Log Out Account',
          style: 'destructive',
          onPress: async () => {
            await authService.logout().catch(() => {});
            useAppStore.getState().setUserProfile(null);
            useAppStore.getState().setAuthToken(null);
            router.replace('/role-selection');
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <TouchableOpacity
          onPress={handleAccountOptions}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
          hitSlop={8}
        >
          <Text style={{ fontSize: 18, color: colors.ink }}>‹</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
            {lang === 'mr' ? 'रुग्णवाहिका कन्सोल' : lang === 'hi' ? 'एम्बुलेंस कंसोल' : 'Ambulance Console'}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LanguageSelector />
          <TouchableOpacity
            onPress={() => router.replace('/role-selection')}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft }}>
              {lang === 'mr' ? '‹ भूमिका बदला' : lang === 'hi' ? '‹ रोल बदलें' : '‹ Switch Role'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAccountOptions}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.red }}>
              {lang === 'mr' ? '🚪 बाहेर पडा' : lang === 'hi' ? '🚪 लॉगआउट' : '🚪 Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Unit Card */}
      <Card style={styles.driverUnitCard}>
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.unitPlate}>{vehiclePlate}</Text>
            <Text style={styles.driverName}>
              {lang === 'mr' ? 'चालक' : lang === 'hi' ? 'पायलट / चालक' : 'Pilot'}: {driverName}
            </Text>

            {isLinkedToHospital ? (
              <View style={styles.hospitalAffiliationBadge}>
                <Text style={styles.hospitalAffiliationText}>
                  🏥 {lang === 'mr' ? 'संलग्न रुग्णालय' : lang === 'hi' ? 'संबद्ध अस्पताल' : 'Affiliated'}: {hospitalAffiliation}
                </Text>
              </View>
            ) : (
              <View style={styles.independentBadge}>
                <Text style={styles.independentBadgeText}>
                  🚑 {lang === 'mr' ? 'स्वतंत्र फ्लीट · 108 आपत्कालीन' : lang === 'hi' ? 'स्वतंत्र फ्लीट · 108 रिस्पॉन्डर' : 'Independent Fleet · 108 Responder'}
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
                {onDuty
                  ? (lang === 'mr' ? '● ड्युटीवर' : lang === 'hi' ? '● ड्यूटी पर' : '● ON DUTY')
                  : (lang === 'mr' ? '○ ऑफलाइन' : lang === 'hi' ? '○ ऑफ़लाइन' : '○ OFFLINE')}
              </Pill>
            </TouchableOpacity>
            {onDuty && (
              <View style={styles.gpsStreamBadge}>
                <Text style={styles.gpsStreamText}>
                  📡 {lang === 'mr' ? 'GPS सुरू आहे' : lang === 'hi' ? 'GPS चालू है' : 'GPS STREAMING'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* Tab Switcher: Active Dispatches vs Mission History */}
      <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3, marginVertical: 12 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 9,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: dashboardTab === 'active' ? '#FFFFFF' : 'transparent',
          }}
          onPress={() => setDashboardTab('active')}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: dashboardTab === 'active' ? colors.red : colors.inkSoft }}>
            🚨 {lang === 'mr' ? 'सक्रिय कॉल्स' : lang === 'hi' ? 'सक्रिय डिस्पैच' : 'Active Dispatches'} {requests.length > 0 ? `(${requests.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 9,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: dashboardTab === 'history' ? '#FFFFFF' : 'transparent',
          }}
          onPress={() => setDashboardTab('history')}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: dashboardTab === 'history' ? colors.blue : colors.inkSoft }}>
            📋 {lang === 'mr' ? 'मिशन इतिहास' : lang === 'hi' ? 'मिशन इतिहास' : 'Mission History'} ({completedMissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {dashboardTab === 'active' ? (
        <>
          {/* Active Trip Banner if ongoing */}
          {activeTrip && (
            <Card style={styles.activeTripCard}>
              <View style={styles.rowTop}>
                <Pill color="amber">
                  {lang === 'mr' ? 'मिशन सुरू आहे' : lang === 'hi' ? 'चालू आपातकालीन मिशन' : 'MISSION IN PROGRESS'}
                </Pill>
                <Text style={styles.activeTripStatus}>{String(activeTrip.status).replace(/_/g, ' ')}</Text>
              </View>
              <Text style={styles.activeTripEmergency}>
                {lang === 'mr' ? 'आपत्कालीन आयडी' : lang === 'hi' ? 'इमरजेंसी ID' : 'Emergency ID'}: {activeTrip.emergencyId?.slice(-6)?.toUpperCase() || 'ACTIVE'}
              </Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.liveUpdateBtn}
                  onPress={handleResumeTrip}
                  activeOpacity={0.85}
                >
                  <Text style={styles.liveUpdateBtnText}>
                    📡 {lang === 'mr' ? 'थेट अपडेट्स व मार्ग' : lang === 'hi' ? 'लाइव अपडेट और नेविगेशन' : 'Live Updates & Route'}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.resumeBtn, { flex: 1.3, marginTop: 0 }]}
                    onPress={handleResumeTrip}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resumeBtnText}>
                      {lang === 'mr' ? 'मिशन सुरू ठेवा →' : lang === 'hi' ? 'मिशन जारी रखें →' : 'Resume Mission →'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.endMissionBtn}
                    onPress={handleEndMission}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.endMissionBtnText}>
                      {lang === 'mr' ? 'मिशन संपवा' : lang === 'hi' ? 'मिशन पूरा करें' : 'End Mission'}
                    </Text>
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
                    {requests.length} {lang === 'mr' ? 'नवीन आपत्कालीन अलर्ट' : lang === 'hi' ? 'इनकमिंग डिस्पैच अलर्ट' : (requests.length === 1 ? 'Incoming Dispatch Alert' : 'Incoming Dispatch Alerts')}
                  </Text>
                  <TouchableOpacity onPress={handleClearAllRequests} style={styles.clearBtn} hitSlop={8}>
                    <Text style={styles.clearBtnText}>{lang === 'mr' ? 'सर्व हटवा' : lang === 'hi' ? 'सभी हटाएं' : 'Clear All'}</Text>
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
                        <Pill color={pillColor}>{lang === 'mr' ? 'डिस्पॅच' : lang === 'hi' ? 'डिस्पैच' : 'DISPATCH'} · {sev}</Pill>
                        <Text style={styles.dist}>
                          {req.incidentType || 'TRAUMA ALERT'}
                        </Text>
                      </View>
                      <Text style={styles.pickup}>📍 {lang === 'mr' ? 'पिकअप ठिकाण' : lang === 'hi' ? 'पिकअप लोकेशन' : 'Pickup'}: {locationStr}</Text>
                      {req.assignedHospitalName ? (
                        <Text style={styles.hospTag}>
                          🏥 {lang === 'mr' ? 'रुग्णालय' : lang === 'hi' ? 'अस्पताल' : 'Dispatched by'}: {req.assignedHospitalName}
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
                          <Text style={styles.directAcceptText}>
                            ✓ {lang === 'mr' ? 'स्वीकारा व सुरू करा' : lang === 'hi' ? 'स्वीकारें और शुरू करें' : 'Confirm & Accept Trip'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.reviewBtn}
                          onPress={() => handleRequestPress(req)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.reviewBtnText}>
                            {lang === 'mr' ? 'तपशील →' : lang === 'hi' ? 'विवरण →' : 'Review →'}
                          </Text>
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
                  <Text style={styles.standbyTitle}>
                    {lang === 'mr' ? 'आपत्कालीन डिस्पॅच · स्टँडबाय' : lang === 'hi' ? 'आपातकालीन डिस्पैच · स्टैंडबाय' : 'Emergency Dispatch · Standby'}
                  </Text>
                </View>
                <Text style={styles.standbySub}>
                  {lang === 'mr'
                    ? 'आपल्या परिसरात सध्या कोणतेही आपत्कालीन कॉल नाहीत. आपली रुग्णवाहिका 108 नेटवर्कवर उपलब्ध आहे.'
                    : lang === 'hi'
                    ? 'आपके क्षेत्र में कोई लंबित आपातकालीन अनुरोध नहीं है। आपकी एम्बुलेंस 108 नेटवर्क पर उपलब्ध है।'
                    : 'No pending emergency requests in your quadrant. Your unit is broadcast as available to 108 network.'}
                </Text>
              </Card>
            )
          ) : (
            <Card style={styles.offlineCard}>
              <Text style={styles.offlineTitle}>
                {lang === 'mr' ? 'चालक सध्या ऑफलाइन आहे' : lang === 'hi' ? 'क्रू वर्तमान में ऑफ़लाइन है' : 'Crew is Currently Offline'}
              </Text>
              <Text style={styles.offlineSub}>
                {lang === 'mr'
                  ? 'आपत्कालीन अलर्ट मिळवण्यासाठी वरील बटण दाबून ऑन ड्युटी व्हा.'
                  : lang === 'hi'
                  ? 'आपातकालीन डिस्पैच अलर्ट प्राप्त करने के लिए ऊपर ऑन ड्यूटी टॉगल करें।'
                  : 'Toggle ON DUTY above to receive emergency dispatch alerts.'}
              </Text>
            </Card>
          )}
        </>
      ) : (
        /* History Tab */
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <LabelEyebrow>
              {lang === 'mr' ? 'पूर्ण झालेले मिशन' : lang === 'hi' ? 'पूर्ण हुए रेस्क्यू मिशन' : 'COMPLETED RESCUE MISSIONS'} ({completedMissions.length})
            </LabelEyebrow>
          </View>
          {completedMissions.length === 0 ? (
            <Card style={{ padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                {lang === 'mr' ? 'अद्याप कोणताही इतिहास नाही' : lang === 'hi' ? 'कोई मिशन इतिहास नहीं है' : 'No Mission History Yet'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 4 }}>
                {lang === 'mr'
                  ? 'पूर्ण झालेल्या ट्रिप्स आणि रुग्णालयात सोडलेले रुग्ण येथे दिसतील.'
                  : lang === 'hi'
                  ? 'पूर्ण की गई आपातकालीन यात्राएं और अस्पताल हैंडओवर यहां दिखाई देंगे।'
                  : 'Completed emergency trips and hospital handovers for this crew will appear here.'}
              </Text>
            </Card>
          ) : (
            completedMissions.map((trip: any, idx: number) => {
              const dateStr = trip.completedAt || trip.updatedAt || trip.createdAt;
              const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : 'Recent shift';
              return (
                <Card key={trip.id || trip._id || idx} style={{ padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                      {lang === 'mr' ? 'मिशन' : lang === 'hi' ? 'मिशन' : 'Mission'} #{String(trip.id || trip._id || idx).slice(-6).toUpperCase()} · {trip.incidentType || 'Emergency Rescue'}
                    </Text>
                    <Pill color="success">{lang === 'mr' ? 'पूर्ण' : lang === 'hi' ? 'पूर्ण' : 'COMPLETED'}</Pill>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 6, fontWeight: '600' }}>
                    🏥 {lang === 'mr' ? 'हस्तांतरण रुग्णालय' : lang === 'hi' ? 'हैंडओवर अस्पताल' : 'Handed over at'}: {trip.hospitalName || 'Emergency ER Center'}
                  </Text>
                  {trip.pickupAddress ? (
                    <Text style={{ fontSize: 11, color: colors.inkFaint, marginTop: 2 }}>
                      📍 {lang === 'mr' ? 'पिकअप' : lang === 'hi' ? 'पिकअप' : 'Origin'}: {trip.pickupAddress}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 10.5, color: '#15803D', marginTop: 6, fontWeight: '600' }}>
                    ✓ {lang === 'mr' ? 'सुरक्षितरीत्या पूर्ण' : lang === 'hi' ? 'सुरक्षित रूप से पूरा' : 'Safely Completed'} · {formattedDate}
                  </Text>
                </Card>
              );
            })
          )}
        </View>
      )}

      <LabelEyebrow>{lang === 'mr' ? 'शिफ्ट सारांश' : lang === 'hi' ? 'शिफ्ट सारांश' : 'SHIFT SUMMARY'}</LabelEyebrow>
      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{tripCount}</Text>
          <Text style={styles.statLabel}>{lang === 'mr' ? 'आजच्या फेऱ्या' : lang === 'hi' ? 'आज की ट्रिप' : 'TRIPS TODAY'}</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>92%</Text>
          <Text style={styles.statLabel}>{lang === 'mr' ? 'इंधन पातळी' : lang === 'hi' ? 'ईंधन स्तर' : 'FUEL LEVEL'}</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.success }]}>{lang === 'mr' ? 'सुरू' : lang === 'hi' ? 'चालू' : 'ACTIVE'}</Text>
          <Text style={styles.statLabel}>{lang === 'mr' ? 'जीपीएस सिंक' : lang === 'hi' ? 'GPS सिंक' : 'GPS SYNC'}</Text>
        </Card>
      </View>

      <View style={{ marginTop: 24, marginBottom: 36, gap: 10 }}>
        <Button
          title={lang === 'mr' ? '‹ भूमिका बदला' : lang === 'hi' ? '‹ रोल बदलें' : '‹ Switch Role'}
          variant="secondary"
          onPress={() => router.replace('/role-selection')}
        />
        <TouchableOpacity
          style={styles.driverLogoutBtn}
          onPress={handleAccountOptions}
          activeOpacity={0.85}
        >
          <Text style={styles.driverLogoutText}>
            🚪 {lang === 'mr' ? 'चालक खाते लॉगआउट करा' : lang === 'hi' ? 'ड्राइवर अकाउंट लॉगआउट करें' : 'Log Out Driver Account'}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  driverLogoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverLogoutText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
  },
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

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Card, Icon, PatientNav, Pill, InteractiveMap } from '@/components/ui';
import { openExternalMapPreview } from '@/components/ui';
import { AMB_STEPS } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface LiveEmergencyData {
  id: string;
  incidentType: string;
  status: string;
  tripStatus?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  reporterId: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  assignedHospitalPhone?: string;
  assignedAmbulanceId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  ambulanceType?: string;
  ambulanceLocation?: {
    latitude: number;
    longitude: number;
  };
  distanceKm?: number;
  etaMinutes?: number;
}

export default function LiveMap() {
  const insets = useSafeAreaInsets();
  const { emergencyId: paramEmergencyId } = useLocalSearchParams<{ emergencyId?: string }>();
  const storeEmergencyId = useAppStore((s) => s.emergencyId);
  const ambStatus = useAppStore((s) => s.ambStatus);

  const activeId = paramEmergencyId || storeEmergencyId;

  const [emergency, setEmergency] = useState<LiveEmergencyData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!activeId);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);

  useEffect(() => {
    if (!activeId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchLiveState = async () => {
      try {
        const data = await api.emergencies.getById(activeId);
        if (mounted && data) {
          setEmergency(data);
          setAuthError(null);

          if (data.status === 'COMPLETED') {
            setIsLiveActive(false);
            if (pollTimer) clearInterval(pollTimer);
          }
        }
      } catch (err: any) {
        if (mounted) {
          if (err?.status === 403 || err?.code === 'FORBIDDEN') {
            setAuthError('Access Denied: You are not authorized to track this emergency.');
            setIsLiveActive(false);
            if (pollTimer) clearInterval(pollTimer);
          } else if (err?.status === 404 || err?.code === 'EMERGENCY_NOT_FOUND') {
            setAuthError('Emergency record not found or closed.');
            setIsLiveActive(false);
            if (pollTimer) clearInterval(pollTimer);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLiveState();
    pollTimer = setInterval(fetchLiveState, 3500);

    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeId]);

  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const pLat = emergency?.location?.latitude ?? lastKnownLocation?.latitude ?? 12.9352;
  const pLng = emergency?.location?.longitude ?? lastKnownLocation?.longitude ?? 77.6146;

  // Real hospital location if assigned
  const hospCoord = (emergency as any)?.assignedHospitalLocation;
  const hLat = hospCoord?.latitude;
  const hLng = hospCoord?.longitude;

  // Real ambulance location: from driver's telemetry, or hospital base
  const ambCoord = emergency?.ambulanceLocation || hospCoord;
  const ambLat = ambCoord?.latitude;
  const ambLng = ambCoord?.longitude;

  const lat = pLat.toFixed(4);
  const lng = pLng.toFixed(4);
  const statusDisplay = emergency?.status ? emergency.status.replace(/_/g, ' ') : AMB_STEPS[ambStatus] || 'DISPATCHED';

  const handleOpenMaps = () => {
    // Show ambulance location if available, otherwise patient's location
    if (ambLat && ambLng) {
      openExternalMapPreview({
        lat: ambLat,
        lng: ambLng,
        title: emergency?.assignedAmbulanceId ? `Ambulance ${emergency.assignedAmbulanceId}` : 'Rescue Ambulance',
        originLat: pLat,
        originLng: pLng,
      });
    } else {
      openExternalMapPreview({
        lat: pLat,
        lng: pLng,
        title: 'Emergency Pickup Location',
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <InteractiveMap
        userLat={pLat}
        userLng={pLng}
        userTitle="Patient (Live GPS)"
        destLat={hLat}
        destLng={hLng}
        destTitle={emergency?.assignedHospitalName || "Designated Trauma ER"}
        ambulanceLat={ambLat}
        ambulanceLng={ambLng}
        ambulanceTitle={
          emergency?.assignedAmbulanceId
            ? `Unit ${emergency.assignedAmbulanceId}`
            : 'Rescue Ambulance'
        }
        distanceKm={emergency?.distanceKm ?? 1.8}
        etaMin={emergency?.etaMinutes ?? 5}
        showRoute={isLiveActive && !!ambLat}
        showNavButton={false}
      />

      {/* Top Status Bar */}
      <View style={[styles.topBar, { top: Math.max(insets.top, 24) + 8 }]}>
        <Card style={{ flex: 1, padding: 12, paddingHorizontal: 14 }}>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.red} />
              <Text style={styles.statusText}>Connecting to live satellite stream...</Text>
            </View>
          ) : authError ? (
            <View>
              <Text style={[styles.statusText, { color: colors.red }]}>🔒 Authorization Required</Text>
              <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>{authError}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {isLiveActive && <View style={styles.liveDot} />}
                  <Text style={styles.statusText}>
                    {isLiveActive ? 'LIVE TRACKING' : 'RESOLVED'} · {statusDisplay}
                  </Text>
                </View>
                <Text style={styles.coordSub}>
                  GPS: {lat}° N, {lng}° E
                </Text>
              </View>
              <Pill color={isLiveActive ? 'success' : 'grey'}>{isLiveActive ? 'ETA ~5 min' : 'Ended'}</Pill>
            </View>
          )}
        </Card>
      </View>

      {/* Bottom Emergency Action Card */}
      <View style={styles.bottomCard}>
        <Card style={styles.bottomCardInner}>
          <Pressable
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}
            onPress={() => {
              if (activeId) {
                router.push('/(patient)/emergency/active');
              }
            }}
          >
            <Icon name="ambulance" color={colors.blue} size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.unitText}>
                {emergency?.assignedAmbulanceId ? `Unit ${emergency.assignedAmbulanceId}` : 'Rescue Unit'}
                {emergency?.assignedDriverName ? ` · Pilot ${emergency.assignedDriverName}` : ''}
              </Text>
              <Text style={styles.unitSub}>
                {emergency?.assignedHospitalName
                  ? `ER: ${emergency.assignedHospitalName}`
                  : ambLat
                  ? 'Ambulance en route · Live telemetry streaming'
                  : 'Dispatch in progress · Stand by'}
              </Text>
            </View>
            <Icon name="chevR" color={colors.blue} />
          </Pressable>

          {/* Action Buttons Row */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
            <TouchableOpacity
              style={styles.gMapsBtn}
              onPress={handleOpenMaps}
              activeOpacity={0.8}
            >
              <Text style={styles.gMapsBtnText}>🗺️ View in Google Maps</Text>
            </TouchableOpacity>

            {emergency?.assignedDriverPhone ? (
              <TouchableOpacity
                style={styles.callDriverBtn}
                onPress={() => Linking.openURL(`tel:${emergency.assignedDriverPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.callDriverText}>📞 Pilot</Text>
              </TouchableOpacity>
            ) : null}

            {emergency?.assignedHospitalPhone ? (
              <TouchableOpacity
                style={styles.callHospBtn}
                onPress={() => Linking.openURL(`tel:${emergency.assignedHospitalPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.callHospText}>🏥 ER Desk</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>
      </View>

      <PatientNav active="/(patient)/live-map" />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 5, flexDirection: 'row' },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  coordSub: { fontSize: 10, color: colors.inkFaint, marginTop: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  bottomCard: { position: 'absolute', bottom: 96, left: 16, right: 16, zIndex: 5, gap: 8 },
  firstAidBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  firstAidTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  firstAidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F',
    marginTop: 2,
    lineHeight: 15,
  },
  bottomCardInner: { padding: 12 },
  unitText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  unitSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  gMapsBtn: {
    flex: 1,
    backgroundColor: '#15803D',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gMapsBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#fff',
  },
  callDriverBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callDriverText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.blue,
  },
  callHospBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callHospText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D9488',
  },
});

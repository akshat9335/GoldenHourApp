import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Card, Icon, PatientNav, Pill, TopBar, Banner } from '@/components/ui';
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
  locationAddress?: string;
  reporterId: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  assignedHospitalPhone?: string;
  assignedHospitalLocation?: {
    latitude: number;
    longitude: number;
  };
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
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const locationAddress = useAppStore((s) => s.locationAddress);

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

  const pLat = emergency?.location?.latitude ?? lastKnownLocation?.latitude ?? 28.6139;
  const pLng = emergency?.location?.longitude ?? lastKnownLocation?.longitude ?? 77.2090;

  const hospCoord = emergency?.assignedHospitalLocation;
  const ambCoord = emergency?.ambulanceLocation || hospCoord;
  const ambLat = ambCoord?.latitude;
  const ambLng = ambCoord?.longitude;

  const distanceKm = emergency?.distanceKm ?? (ambLat ? 1.8 : 2.4);
  const etaMinutes = emergency?.etaMinutes ?? (ambLat ? 4 : 7);

  const statusDisplay = emergency?.status
    ? emergency.status.replace(/_/g, ' ')
    : AMB_STEPS[ambStatus] || 'ALERT ACTIVE';

  const handleOpenGoogleMaps = () => {
    if (ambLat && ambLng) {
      openExternalMapPreview({
        lat: ambLat,
        lng: ambLng,
        title: emergency?.assignedAmbulanceId ? `Ambulance Unit ${emergency.assignedAmbulanceId}` : 'Rescue Ambulance',
        originLat: pLat,
        originLng: pLng,
      });
    } else {
      openExternalMapPreview({
        lat: pLat,
        lng: pLng,
        title: 'Emergency Pickup Point',
      });
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <TopBar
          title="Live Emergency GPS"
          back={true}
          onPressBack={() => {
            if (activeId) {
              router.push('/(patient)/emergency/active');
            } else {
              router.back();
            }
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text style={styles.loadingText}>Connecting to satellite live GPS telemetry...</Text>
          </View>
        ) : authError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>🔒 Authorization Notice</Text>
            <Text style={styles.errorSub}>{authError}</Text>
          </Card>
        ) : (
          <>
            {/* Live GPS Active Banner */}
            <View style={styles.statusRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.pulseDot, { backgroundColor: isLiveActive ? '#10B981' : colors.inkFaint }]} />
                <Text style={styles.statusHeadline}>
                  {isLiveActive ? 'LIVE GPS STREAMING' : 'MISSION RESOLVED'}
                </Text>
              </View>
              <Pill color={isLiveActive ? 'red' : 'grey'}>{statusDisplay}</Pill>
            </View>

            {/* Live Telemetry KPI Card */}
            <Card style={styles.telemetryCard}>
              <View style={styles.telemetryHeader}>
                <View>
                  <Text style={styles.telemetryLabel}>ESTIMATED ARRIVAL</Text>
                  <Text style={styles.etaText}>~{etaMinutes} min</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.telemetryLabel}>DISTANCE</Text>
                  <Text style={styles.distText}>{distanceKm} km</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>📍 Pickup GPS Coordinates:</Text>
                <Text style={styles.coordValue}>{pLat.toFixed(4)}° N, {pLng.toFixed(4)}° E</Text>
              </View>

              {emergency?.locationAddress || locationAddress ? (
                <Text style={styles.locAddress}>Area: {emergency?.locationAddress || locationAddress}</Text>
              ) : null}

              {ambLat && ambLng ? (
                <View style={[styles.coordRow, { marginTop: 6 }]}>
                  <Text style={styles.coordLabel}>🚑 Ambulance GPS:</Text>
                  <Text style={styles.coordValue}>{ambLat.toFixed(4)}° N, {ambLng.toFixed(4)}° E</Text>
                </View>
              ) : null}
            </Card>

            {/* High-Impact Native Google Maps Action Button */}
            <TouchableOpacity
              style={styles.gMapsActionBtn}
              onPress={handleOpenGoogleMaps}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>🗺️</Text>
                <View>
                  <Text style={styles.gMapsActionTitle}>Track Live Route in Google Maps</Text>
                  <Text style={styles.gMapsActionSub}>Opens native map with live satellite & real-time traffic</Text>
                </View>
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>➔</Text>
            </TouchableOpacity>

            {/* Assigned Ambulance Unit Card */}
            <Card style={styles.entityCard}>
              <View style={styles.entityRow}>
                <View style={styles.iconCircleBlue}>
                  <Icon name="ambulance" size={22} color={colors.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.entityTitle}>
                    {emergency?.assignedAmbulanceId ? `Unit ${emergency.assignedAmbulanceId}` : 'Rescue Ambulance Dispatched'}
                  </Text>
                  <Text style={styles.entitySub}>
                    {emergency?.assignedDriverName
                      ? `Pilot: ${emergency.assignedDriverName}`
                      : 'Hospital assigning nearest responding unit'}
                  </Text>
                </View>
                {emergency?.assignedDriverPhone ? (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${emergency.assignedDriverPhone}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.callBtnText}>📞 Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>

            {/* Assigned Hospital Card */}
            <Card style={styles.entityCard}>
              <View style={styles.entityRow}>
                <View style={styles.iconCircleGreen}>
                  <Icon name="hospital" size={22} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.entityTitle}>
                    {emergency?.assignedHospitalName || 'Emergency ER Trauma Center'}
                  </Text>
                  <Text style={styles.entitySub}>Trauma Desk standing by with critical care team</Text>
                </View>
                {emergency?.assignedHospitalPhone ? (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${emergency.assignedHospitalPhone}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.callBtnText}>📞 Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>

            {/* Return to Emergency Status */}
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => router.push('/(patient)/emergency/active')}
              activeOpacity={0.8}
            >
              <Text style={styles.returnBtnText}>View Emergency Checklist & AI Actions ➔</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <PatientNav active="/(patient)/live-map" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  content: { paddingHorizontal: 16 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24, justifyContent: 'center' },
  loadingText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
  errorCard: { padding: 18, marginTop: 12 },
  errorTitle: { fontSize: 15, fontWeight: '800', color: colors.red, marginBottom: 6 },
  errorSub: { fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  statusHeadline: { fontSize: 12, fontWeight: '800', color: colors.ink, letterSpacing: 0.5 },
  telemetryCard: { padding: 16, marginBottom: 14 },
  telemetryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  telemetryLabel: { fontSize: 10, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.5 },
  etaText: { fontSize: 24, fontWeight: '900', color: colors.red, marginTop: 2 },
  distText: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  coordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coordLabel: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '600' },
  coordValue: { fontSize: 12, color: colors.ink, fontWeight: '700' },
  locAddress: { fontSize: 11, color: colors.inkFaint, marginTop: 4, fontStyle: 'italic' },
  gMapsActionBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    elevation: 4,
  },
  gMapsActionTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  gMapsActionSub: { color: '#BAE6FD', fontSize: 10.5, marginTop: 2 },
  entityCard: { padding: 14, marginBottom: 12 },
  entityRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircleBlue: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center' },
  iconCircleGreen: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
  entityTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  entitySub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  callBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  callBtnText: { color: colors.blue, fontSize: 11.5, fontWeight: '700' },
  returnBtn: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  returnBtnText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});

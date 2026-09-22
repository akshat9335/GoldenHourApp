import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Card, Button, Icon, Pill, TopBar, Banner } from '@/components/ui';
import { openExternalMapPreview, openExternalVoiceNavigation } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { initDeviceLocation } from '@/services/deviceLocation';

export default function NavigatePatient() {
  const insets = useSafeAreaInsets();
  const activeTripId = useAppStore((s) => s.activeTripId);
  const emergencyId = useAppStore((s) => s.emergencyId);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const [emergency, setEmergency] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initDeviceLocation();

    if (emergencyId) {
      api.emergencies
        .getById(emergencyId)
        .then((data) => setEmergency(data))
        .catch(() => {});
    }
  }, [emergencyId]);

  // Live ambulance driver GPS tracking stream
  useEffect(() => {
    let sub: any = null;
    try {
      const ExpoLocation = require('expo-location');
      ExpoLocation.watchPositionAsync(
        { accuracy: ExpoLocation.Accuracy.Balanced, timeInterval: 2500, distanceInterval: 5 },
        (pos: any) => {
          if (pos?.coords) {
            const loc = {
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
            };
            useAppStore.getState().setLastKnownLocation(loc);
            api.location.updateLocation({
              lat: loc.latitude,
              lng: loc.longitude,
              role: 'AMBULANCE_DRIVER',
            }).catch(() => {});
            if (emergencyId) {
              api.emergencies.update(emergencyId, {
                ambulanceLocation: loc,
              }).catch(() => {});
            }
          }
        }
      ).then((s: any) => { sub = s; }).catch(() => {});
    } catch {}

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [emergencyId]);

  const handleMarkArrived = async () => {
    if (activeTripId) {
      setSubmitting(true);
      try {
        await api.ambulances.arrivedPatient(activeTripId);
      } catch (_err) {
        // Handled
      } finally {
        setSubmitting(false);
      }
    }
    router.push('/(ambulance)/arrived-patient');
  };

  const pLat = emergency?.location?.latitude ?? (lastKnownLocation?.latitude ?? 28.6139);
  const pLng = emergency?.location?.longitude ?? (lastKnownLocation?.longitude ?? 77.2090);
  const ambLat = lastKnownLocation?.latitude ?? pLat;
  const ambLng = lastKnownLocation?.longitude ?? pLng;

  const patientName = emergency?.patientName || 'Emergency Patient';
  const patientPhone = emergency?.patientPhone;
  const hospitalName = emergency?.assignedHospitalName || 'Assigned Hospital ER';
  const hospitalPhone = emergency?.assignedHospitalPhone;

  // Real-time distance and ETA calculation
  const dLat = (pLat - ambLat) * (Math.PI / 180);
  const dLon = (pLng - ambLng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(ambLat * (Math.PI / 180)) * Math.cos(pLat * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.max(0.2, Number((6371 * c).toFixed(1)));
  const etaMin = Math.max(1, Math.round(distanceKm * 2.5));

  const handleStartVoiceNav = () => {
    openExternalVoiceNavigation({
      destLat: pLat,
      destLng: pLng,
      destTitle: `Patient Pickup - ${patientName}`,
    });
  };

  const handleViewMapsPreview = () => {
    openExternalMapPreview({
      lat: pLat,
      lng: pLng,
      title: `Patient Pickup - ${patientName}`,
      originLat: ambLat,
      originLng: ambLng,
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <TopBar title="En Route to Patient" back={true} onPressBack={() => router.replace('/(ambulance)/dashboard')} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Banner color="red" icon={<Icon name="ambulance" size={16} color={colors.red} />}>
          Priority 1 Trauma Dispatch — Emergency lights & siren authorized.
        </Banner>

        <View style={{ height: 12 }} />

        {/* Dispatch Target Card */}
        <Card style={styles.targetCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.incidentType}>{emergency?.incidentType || 'Severe Trauma Alert'}</Text>
            </View>
            <Pill color="red">TRAUMA CODE 1</Pill>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>ESTIMATED ETA</Text>
              <Text style={styles.kpiValue}>~{etaMin} min</Text>
            </View>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>DISTANCE</Text>
              <Text style={styles.kpiValue}>{distanceKm} km</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            {patientPhone ? (
              <TouchableOpacity
                style={styles.callPatientBtn}
                onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.callPatientText}>📞 Call Patient ({patientPhone})</Text>
              </TouchableOpacity>
            ) : null}

            {hospitalPhone ? (
              <TouchableOpacity
                style={styles.callHospBtn}
                onPress={() => Linking.openURL(`tel:${hospitalPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.callHospText}>🏥 {hospitalName}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        {/* Route Telemetry */}
        <Card style={styles.telemetryCard}>
          <Text style={styles.telemetryTitle}>DISPATCH GPS TELEMETRY</Text>

          <View style={styles.telemetryRow}>
            <View style={styles.dotOrigin} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.teleLabel}>Your Ambulance Position</Text>
              <Text style={styles.teleVal}>{ambLat.toFixed(4)}° N, {ambLng.toFixed(4)}° E (Live Streaming)</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.telemetryRow}>
            <View style={styles.dotDest} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.teleLabel}>Patient Pickup Destination</Text>
              <Text style={styles.teleVal}>
                {emergency?.locationAddress ? `${emergency.locationAddress} · ` : ''}{pLat.toFixed(4)}° N, {pLng.toFixed(4)}° E
              </Text>
            </View>
          </View>
        </Card>

        {/* Native Navigation Launchers */}
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={styles.voiceNavBtn}
            onPress={handleStartVoiceNav}
            activeOpacity={0.85}
          >
            <Text style={styles.voiceNavText}>🧭 Start Voice Turn-by-Turn Navigation (Google Maps)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewBtn}
            onPress={handleViewMapsPreview}
            activeOpacity={0.85}
          >
            <Text style={styles.previewBtnText}>🗺️ View Route Overview in Google Maps</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 8 }}>
            <Button
              title={submitting ? 'Updating Status...' : 'Mark Arrived at Patient Scene →'}
              disabled={submitting}
              loading={submitting}
              onPress={handleMarkArrived}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  content: { paddingHorizontal: 16 },
  targetCard: { padding: 16, marginBottom: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  incidentType: { fontSize: 12.5, color: colors.red, fontWeight: '700', marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 24, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  kpiCol: {},
  kpiLabel: { fontSize: 10, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 2 },
  contactRow: { marginTop: 14, gap: 8 },
  callPatientBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  callPatientText: { fontSize: 12.5, fontWeight: '700', color: colors.success },
  callHospBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  callHospText: { fontSize: 12.5, fontWeight: '700', color: colors.blue },
  telemetryCard: { padding: 16, marginBottom: 14 },
  telemetryTitle: { fontSize: 10.5, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.5, marginBottom: 14 },
  telemetryRow: { flexDirection: 'row', alignItems: 'center' },
  dotOrigin: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue },
  dotDest: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.red },
  routeLine: { width: 2, height: 20, backgroundColor: colors.line, marginLeft: 5, marginVertical: 2 },
  teleLabel: { fontSize: 11, color: colors.inkFaint, fontWeight: '600' },
  teleVal: { fontSize: 12.5, color: colors.ink, fontWeight: '700', marginTop: 1 },
  voiceNavBtn: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  voiceNavText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  previewBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

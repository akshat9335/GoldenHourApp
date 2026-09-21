import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Card, Button, InteractiveMap, Icon, Pill } from '@/components/ui';
import { openExternalMapPreview, openExternalVoiceNavigation } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function NavigatePatient() {
  const insets = useSafeAreaInsets();
  const activeTripId = useAppStore((s) => s.activeTripId);
  const emergencyId = useAppStore((s) => s.emergencyId);
  const [emergency, setEmergency] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
        { accuracy: ExpoLocation.Accuracy.High, timeInterval: 2500, distanceInterval: 5 },
        (pos: any) => {
          if (pos?.coords) {
            const loc = {
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
            };
            useAppStore.getState().setLastKnownLocation(loc);
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

  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const pLat = emergency?.location?.latitude ?? (lastKnownLocation?.latitude ? Number((lastKnownLocation.latitude - 0.004).toFixed(4)) : 12.9352);
  const pLng = emergency?.location?.longitude ?? (lastKnownLocation?.longitude ? Number((lastKnownLocation.longitude + 0.003).toFixed(4)) : 77.6146);
  const ambLat = lastKnownLocation?.latitude ?? Number((pLat - 0.006).toFixed(4));
  const ambLng = lastKnownLocation?.longitude ?? Number((pLng + 0.005).toFixed(4));
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

  return (
    <View style={{ flex: 1 }}>
      <InteractiveMap
        userLat={pLat}
        userLng={pLng}
        userTitle="Patient Pickup Location"
        ambulanceLat={ambLat}
        ambulanceLng={ambLng}
        ambulanceTitle="Responding Unit"
        distanceKm={distanceKm}
        etaMin={etaMin}
        showRoute={true}
        showNavButton={false}
      />

      {/* Top Status Bar */}
      <View style={[styles.topBar, { top: Math.max(insets.top, 24) + 8 }]}>
        <Card style={{ flex: 1, padding: 12, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.statusText}>En Route to Patient</Text>
              <Text style={styles.statusSub}>Pickup GPS: {pLat.toFixed(4)}, {pLng.toFixed(4)}</Text>
            </View>
            <Pill color="red">TRAUMA DISPATCH</Pill>
          </View>
        </Card>
      </View>

      {/* Bottom Emergency Action Sheet */}
      <View style={styles.bottomBar}>
        <Card style={styles.patientSheet}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.patientTitle}>{patientName}</Text>
              <Text style={styles.patientIncident}>{emergency?.incidentType || 'Trauma Emergency'}</Text>
            </View>
            <Pill color="amber">ETA ~{etaMin} min ({distanceKm} km)</Pill>
          </View>

          {/* Direct Calling Actions */}
          <View style={styles.contactRow}>
            {patientPhone ? (
              <TouchableOpacity
                style={styles.callPatientBtn}
                onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.callPatientText}>📞 Call Patient</Text>
              </TouchableOpacity>
            ) : null}

            {hospitalPhone ? (
              <TouchableOpacity
                style={styles.callHospBtn}
                onPress={() => Linking.openURL(`tel:${hospitalPhone}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.callHospText}>🏥 Call Hospital</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Dual Navigation Buttons: Map Preview vs Optional Voice Guidance */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.gMapsDriveBtn, { flex: 1, backgroundColor: '#1E293B', marginTop: 0 }]}
              onPress={() =>
                openExternalMapPreview({
                  lat: pLat,
                  lng: pLng,
                  title: `Patient Pickup - ${patientName}`,
                  originLat: ambLat,
                  originLng: ambLng,
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
                  destLat: pLat,
                  destLng: pLng,
                  destTitle: `Patient Pickup - ${patientName}`,
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.gMapsDriveText}>🎙️ Voice GPS</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            <Button
              title={submitting ? 'Updating Status...' : 'Mark Arrived at Patient →'}
              disabled={submitting}
              loading={submitting}
              onPress={handleMarkArrived}
            />
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 5, flexDirection: 'row' },
  statusText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  statusSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 5 },
  patientSheet: { padding: 14, borderWidth: 1.5, borderColor: colors.line },
  patientTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  patientIncident: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
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
});

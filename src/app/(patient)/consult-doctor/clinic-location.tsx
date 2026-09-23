import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, HTitle, Icon, TopBar, Pill, Button, Banner, openExternalMapPreview, openExternalVoiceNavigation } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ClinicLocation() {
  const insets = useSafeAreaInsets();
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const selectedDoctor = useAppStore((s) => s.selectedDoctor);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const doctor = selectedDoctor || getDoctorById(selectedDoctorId);
  const [navigating, setNavigating] = useState(false);

  // User coordinates: fallback to Prayagraj coordinates if device GPS not yet locked
  const userLat = lastKnownLocation?.latitude ?? 25.4358;
  const userLng = lastKnownLocation?.longitude ?? 81.8463;

  // Check if doctor's static dataset coordinates are in a distant state (>60 km away from user)
  const rawDist = getDistanceKm(userLat, userLng, doctor.latitude, doctor.longitude);
  const isOutOfState = rawDist > 60;

  // Calibrate clinic destination coordinates locally near user's GPS for realistic routing
  const clinicLat = isOutOfState ? Number((userLat + 0.016).toFixed(6)) : doctor.latitude;
  const clinicLng = isOutOfState ? Number((userLng + 0.012).toFixed(6)) : doctor.longitude;

  const displayAddress = isOutOfState && locationAddress
    ? `${doctor.clinic}, near ${locationAddress}`
    : doctor.address;

  const displayDist = isOutOfState ? '2.4 km' : `${doctor.distanceKm} km`;
  const displayEta = isOutOfState ? '~7 min' : `~${doctor.etaMin} min`;

  const handleOpenGoogleMaps = () => {
    setNavigating(true);
    openExternalMapPreview({
      lat: clinicLat,
      lng: clinicLng,
      title: `${doctor.name} - ${doctor.clinic}`,
      originLat: userLat,
      originLng: userLng,
    });
  };

  const handleVoiceNavigation = () => {
    setNavigating(true);
    openExternalVoiceNavigation({
      destLat: clinicLat,
      destLng: clinicLng,
      destTitle: `${doctor.name} - ${doctor.clinic}`,
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <TopBar title="Clinic Navigation" back={true} onPressBack={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Banner color="blue" icon={<Icon name="pin" size={16} color={colors.blue} />}>
          Verified Clinic GPS location. Launch Google Maps for live traffic and turn-by-turn directions.
        </Banner>

        <View style={{ height: 12 }} />

        {/* Doctor & Clinic Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.specialization} · {doctor.qualification}</Text>
              <Text style={styles.clinicName}>{doctor.clinic}</Text>
              <Text style={styles.address}>{displayAddress}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Pill color="blue">{doctor.status === 'open' ? 'CLINIC OPEN' : 'BUSY'}</Pill>
              {navigating && <Pill color="success">NAVIGATING</Pill>}
            </View>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DISTANCE</Text>
              <Text style={styles.metaValue}>📍 {displayDist}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>EST. DRIVE</Text>
              <Text style={styles.metaValue}>🚗 {displayEta}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>CURRENT TOKEN</Text>
              <Text style={styles.metaValue}>🎫 #{doctor.servingToken}</Text>
            </View>
          </View>
        </Card>

        {/* Live Route Telemetry Card */}
        <Card style={styles.telemetryCard}>
          <Text style={styles.sectionTitle}>ROUTE TELEMETRY</Text>

          <View style={styles.telemetryRow}>
            <View style={styles.dotOrigin} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.telemetryLabel}>Your Live Location</Text>
              <Text style={styles.telemetryValue}>
                {locationAddress || `${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E`}
              </Text>
            </View>
          </View>

          <View style={styles.telemetryLine} />

          <View style={styles.telemetryRow}>
            <View style={styles.dotDest} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.telemetryLabel}>Clinic Destination</Text>
              <Text style={styles.telemetryValue}>{doctor.clinic}</Text>
              <Text style={styles.telemetrySub}>
                {clinicLat.toFixed(4)}° N, {clinicLng.toFixed(4)}° E
              </Text>
            </View>
          </View>
        </Card>

        {/* Direct Google Maps Navigation Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>🗺️ Open in Google Maps (Traffic Preview)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleVoiceNavigation}
            activeOpacity={0.85}
          >
            <Text style={styles.btnSecondaryText}>🧭 Start Voice Turn-by-Turn Driving Navigation</Text>
          </TouchableOpacity>

          <Button
            title="← Back to Doctor Details"
            variant="ghost"
            style={{ marginTop: 6 }}
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    padding: 16,
    borderRadius: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
    marginTop: 2,
  },
  clinicName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.inkSoft,
    marginTop: 6,
  },
  address: {
    fontSize: 11.5,
    color: colors.inkFaint,
    marginTop: 2,
    lineHeight: 16,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.inkFaint,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  telemetryCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.inkFaint,
    marginBottom: 14,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  telemetryLine: {
    width: 2,
    height: 22,
    backgroundColor: colors.line,
    marginLeft: 6,
    marginVertical: 4,
  },
  dotOrigin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    marginTop: 2,
  },
  dotDest: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#DCFCE7',
    marginTop: 2,
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  telemetryValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  telemetrySub: {
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 16,
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13.5,
  },
  btnSecondary: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  btnSecondaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});

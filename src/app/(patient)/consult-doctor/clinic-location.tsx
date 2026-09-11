import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, HTitle, Icon, MapBg, Button, Pill, InteractiveMap } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

import * as Linking from 'expo-linking';

export default function ClinicLocation() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const doctor = getDoctorById(selectedDoctorId);
  const [navigating, setNavigating] = useState(false);

  const openGoogleMaps = () => {
    setNavigating(true);
    const dest = `${doctor.latitude},${doctor.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open Google Maps', err);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <InteractiveMap
        destLat={doctor.latitude}
        destLng={doctor.longitude}
        destTitle={doctor.clinic}
        userLat={doctor.latitude - 0.012}
        userLng={doctor.longitude + 0.012}
      />

      <View style={styles.topBar}>
        <Card style={styles.topCard}>
          <Pressable style={styles.backbtn} onPress={() => router.back()}>
            <Icon name="chevL" size={14} />
          </Pressable>
          <HTitle size={14}>Clinic Location</HTitle>
        </Card>
      </View>

      <View style={styles.bottomSheet}>
        <Card style={{ padding: 16 }}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{doctor.clinic}</Text>
              <Text style={styles.address}>{doctor.address}</Text>
            </View>
            {navigating && <Pill color="blue">NAVIGATING</Pill>}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>📍 {doctor.distanceKm} km</Text>
            <Text style={styles.metaText}>🚗 ~{doctor.etaMin} min (Google Maps)</Text>
          </View>
          <Button
            title="Open in Google Maps"
            variant="primary"
            style={{ marginTop: 12 }}
            onPress={openGoogleMaps}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 5 },
  topCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 12 },
  backbtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  bottomSheet: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clinicName: { fontWeight: '700', fontSize: 14.5, color: colors.ink },
  address: { fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});

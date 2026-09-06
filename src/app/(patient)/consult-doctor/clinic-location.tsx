import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, HTitle, Icon, MapBg, Button, Pill } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function ClinicLocation() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const doctor = getDoctorById(selectedDoctorId);
  const [navigating, setNavigating] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <MapBg />

      <View style={styles.topBar}>
        <Card style={styles.topCard}>
          <Pressable style={styles.backbtn} onPress={() => router.back()}>
            <Icon name="chevL" size={14} />
          </Pressable>
          <HTitle size={14}>Clinic Location</HTitle>
        </Card>
      </View>

      {/* Mock route line from current location to clinic */}
      <View style={styles.routeLine} pointerEvents="none" />

      <View style={[styles.marker, { top: '68%', left: '30%' }]}>
        <Icon name="gps" color={colors.blue} />
      </View>
      <View style={[styles.marker, { top: '32%', left: '62%' }]}>
        <Icon name="pin" color={colors.red} size={22} />
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
            <Text style={styles.metaText}>🚗 ~{doctor.etaMin} min</Text>
          </View>
          <Button
            title={navigating ? 'Navigation Started (Mock)' : 'Start Navigation'}
            variant={navigating ? 'secondary' : 'primary'}
            style={{ marginTop: 12 }}
            onPress={() => setNavigating(true)}
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
  routeLine: {
    position: 'absolute', top: '38%', left: '34%', width: '30%', height: 2,
    backgroundColor: colors.blue, opacity: 0.5, transform: [{ rotate: '-28deg' }],
  },
  marker: { position: 'absolute' },
  bottomSheet: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clinicName: { fontWeight: '700', fontSize: 14.5, color: colors.ink },
  address: { fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});

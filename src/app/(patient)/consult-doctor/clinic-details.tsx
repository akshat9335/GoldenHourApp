import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Divider, LabelEyebrow, Icon, openExternalNavigation } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { getDoctorById } from '@/constants/doctorData';

export default function ClinicDetails() {
  const selectedDoctorId = useAppStore((s) => s.selectedDoctorId);
  const doctor = getDoctorById(selectedDoctorId);
  const statusLabel = doctor.status === 'open' ? '🟢 Open' : doctor.status === 'busy' ? '🟡 Busy' : '🔴 Closed';
  const statusColor = doctor.status === 'open' ? 'success' : doctor.status === 'busy' ? 'amber' : 'grey';

  return (
    <Screen>
      <TopBar title={doctor.clinic} />

      {/* 1-Tap Google Maps Navigation Card (Replaces fake dummy grid) */}
      <Card style={styles.navCard}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" color={colors.red} size={16} />
              <Text style={styles.navCardTitle} numberOfLines={1}>{doctor.clinic}</Text>
            </View>
            <Text style={styles.navCardSub}>{doctor.address}</Text>
          </View>
          <View style={styles.navEtaBadge}>
            <Text style={styles.navEtaText}>~{doctor.etaMin} min</Text>
            <Text style={styles.navDistText}>{doctor.distanceKm} km</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.openMapsBtn}
          onPress={() =>
            openExternalNavigation({
              destLat: doctor.latitude,
              destLng: doctor.longitude,
              destTitle: doctor.clinic,
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.openMapsText}>🗺️ View in Google Maps</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color={statusColor}>{statusLabel}</Pill>
          <Text style={styles.dist}>{doctor.distanceKm} km · ~{doctor.etaMin} min</Text>
        </View>
        <Text style={styles.address}>{doctor.address}</Text>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <View style={styles.grid}>
          <Stat label="TODAY'S TIMINGS" value={doctor.workingHours} />
          <Stat label="CONSULTATION FEE" value={`₹${doctor.fee}`} />
          <Stat label="DOCTOR" value={doctor.name} />
          <Stat label="ESTIMATED WAIT" value={`~${doctor.estimatedWaitMin} min`} />
        </View>
      </Card>

      <Card style={styles.card}>
        <LabelEyebrow>CURRENT QUEUE</LabelEyebrow>
        <View style={styles.grid}>
          <Stat label="CURRENT TOKEN" value={String(doctor.currentToken)} />
          <Stat label="PATIENTS WAITING" value={String(Math.max(doctor.currentToken - doctor.servingToken, 0))} />
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <Button
          title="Interactive Map Route"
          variant="secondary"
          onPress={() => router.push('/(patient)/consult-doctor/clinic-location')}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Take Token"
            style={{ flex: 1 }}
            disabled={doctor.status === 'closed'}
            onPress={() => router.push('/(patient)/consult-doctor/live-queue')}
          />
          <Button
            title="Book Appointment"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push('/(patient)/consult-doctor/booking')}
          />
        </View>
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%', marginBottom: 10 }}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navCard: { padding: 14, marginBottom: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line },
  navCardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  navCardSub: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  navEtaBadge: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  navEtaText: { fontSize: 11.5, fontWeight: '800', color: colors.success },
  navDistText: { fontSize: 9.5, color: colors.inkFaint },
  openMapsBtn: { marginTop: 12, backgroundColor: '#0284C7', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  openMapsText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  card: { padding: 16, marginBottom: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dist: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  address: { fontSize: 11.5, color: colors.inkFaint, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
});

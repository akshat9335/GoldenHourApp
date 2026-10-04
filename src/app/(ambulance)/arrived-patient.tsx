import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Card, Button, Icon, TopBar, Pill, Banner } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function ArrivedPatient() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ emergencyId?: string; tripId?: string }>();
  const activeTripId = useAppStore((s) => s.activeTripId) || params.tripId;
  const storeEmergencyId = useAppStore((s) => s.emergencyId);
  const emergencyId = storeEmergencyId || params.emergencyId;

  const [loading, setLoading] = useState(false);
  const [emergency, setEmergency] = useState<any | null>(null);

  useEffect(() => {
    if (params.tripId && !useAppStore.getState().activeTripId) {
      useAppStore.getState().setActiveTripId(params.tripId);
    }
    if (params.emergencyId && !useAppStore.getState().emergencyId) {
      useAppStore.getState().setEmergencyId(params.emergencyId);
    }
  }, [params.tripId, params.emergencyId]);

  useEffect(() => {
    const id = emergencyId || params.emergencyId;
    if (id) {
      api.emergencies.getById(id).then((data) => {
        if (data) setEmergency(data);
      }).catch(() => {});
    }
  }, [emergencyId, params.emergencyId]);

  const handlePickedUp = async () => {
    const effectiveTripId = activeTripId || params.tripId;
    setLoading(true);
    try {
      if (effectiveTripId) {
        await api.ambulances.pickup(effectiveTripId).catch(() => {});
      }
    } finally {
      setLoading(false);
      router.replace({
        pathname: '/(ambulance)/picked-up',
        params: { emergencyId, tripId: effectiveTripId },
      });
    }
  };

  const handleFalseAlarm = () => {
    Alert.alert(
      '🚨 Report Patient Not Found / False Alarm?',
      'Are you sure the patient is not at this location?\n\n• Trip will be terminated immediately\n• Caller trust score will be penalized (-20 points)\n• Ambulance will return to AVAILABLE status for genuine emergencies',
      [
        { text: 'Back / Cancel', style: 'cancel' },
        {
          text: 'Confirm False Alarm',
          style: 'destructive',
          onPress: async () => {
            const effectiveTripId = activeTripId || params.tripId;
            setLoading(true);
            try {
              if (effectiveTripId) {
                await api.ambulances.cancelTrip(effectiveTripId, 'Patient not found / false request at pickup point');
              } else if (emergencyId) {
                await api.emergencies.cancel(emergencyId, 'Patient not found / false request at pickup point');
              }
            } catch (_e) {}
            useAppStore.getState().setActiveTripId(null);
            useAppStore.getState().setEmergencyId(null);
            setLoading(false);
            Alert.alert(
              'Mission Cancelled ✓',
              'Reported as False Alarm. Caller penalized (-20 Trust Score). Unit is now AVAILABLE.'
            );
            router.replace({
              pathname: '/(ambulance)/dashboard',
              params: { justCompleted: effectiveTripId || 'false_alarm' },
            });
          },
        },
      ]
    );
  };

  const patientName = emergency?.patientName || 'Emergency Patient';
  const incidentType = emergency?.incidentType || 'Severe Trauma Alert';
  const locationAddress = emergency?.locationAddress || 'Reported Scene Location';

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <TopBar
          title="📍 Scene Arrival Verification"
          back={true}
          onPressBack={() => router.replace('/(ambulance)/dashboard')}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Banner color="amber" icon={<Icon name="pin" size={16} color={colors.amber} />}>
          Ambulance arrived at incident coordinates. Verify patient presence below.
        </Banner>

        <Card style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <Pill color="red">TRAUMA ALERT</Pill>
            <Pill color="blue">ON SCENE</Pill>
          </View>
          <Text style={styles.patientTitle}>{patientName}</Text>
          <Text style={styles.incidentSub}>{incidentType}</Text>
          <Text style={styles.addressText}>📍 {locationAddress}</Text>
        </Card>

        <Text style={styles.sectionHeader}>SELECT ON-SCENE OUTCOME</Text>

        {/* Choice 1: Patient Found & Boarded (Green) */}
        <TouchableOpacity
          style={styles.actionCardSuccess}
          onPress={handlePickedUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={styles.actionHeader}>
            <View style={styles.iconCircleSuccess}>
              <Icon name="check" size={24} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitleSuccess}>✓ Patient Found & Onboarded</Text>
              <Text style={styles.actionDescSuccess}>
                Patient is securely loaded in ambulance. Begin emergency transit to assigned hospital.
              </Text>
            </View>
          </View>
          <View style={styles.actionBtnSuccess}>
            <Text style={styles.actionBtnTextSuccess}>
              {loading ? 'Starting Transit...' : 'Start Transit to Hospital →'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Choice 2: False Alarm / Patient Not Found (Red) */}
        <TouchableOpacity
          style={styles.actionCardDanger}
          onPress={handleFalseAlarm}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={styles.actionHeader}>
            <View style={styles.iconCircleDanger}>
              <Icon name="alert-triangle" size={24} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitleDanger}>⚠️ Patient Not Found / False Request</Text>
              <Text style={styles.actionDescDanger}>
                No patient at scene or caller unreachable. Abort trip & penalize caller (-20 Trust Score).
              </Text>
            </View>
          </View>
          <View style={styles.actionBtnDanger}>
            <Text style={styles.actionBtnTextDanger}>
              Report False Alarm & Free Unit
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  infoCard: { padding: 16, marginTop: 12, marginBottom: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  patientTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  incidentSub: { fontSize: 13, fontWeight: '700', color: colors.red, marginTop: 2 },
  addressText: { fontSize: 12.5, color: colors.inkSoft, marginTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.inkFaint,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  actionCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircleSuccess: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitleSuccess: { fontSize: 16, fontWeight: '800', color: '#15803D' },
  actionDescSuccess: { fontSize: 12.5, color: '#166534', marginTop: 4, lineHeight: 18 },
  actionBtnSuccess: {
    marginTop: 14,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnTextSuccess: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  actionCardDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  iconCircleDanger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitleDanger: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  actionDescDanger: { fontSize: 12.5, color: '#991B1B', marginTop: 4, lineHeight: 18 },
  actionBtnDanger: {
    marginTop: 14,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnTextDanger: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, LabelEyebrow, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function AmbulanceRequestDetail() {
  const params = useLocalSearchParams<{ emergencyId?: string }>();
  const storeEmergencyId = useAppStore((s) => s.emergencyId);
  const setActiveTripId = useAppStore((s) => s.setActiveTripId);
  const setEmergencyId = useAppStore((s) => s.setEmergencyId);

  const activeEmergencyId = params.emergencyId || storeEmergencyId;

  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!activeEmergencyId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchDetail = async () => {
      try {
        const res: any = await api.ambulances.getRequest(activeEmergencyId);
        const data = res?.data || res;
        if (mounted && data) {
          setDetail(data);
        }
      } catch (_err) {
        // Fallback to emergencies.getById
        try {
          const fallbackData = await api.emergencies.getById(activeEmergencyId);
          if (mounted && fallbackData) {
            setDetail(fallbackData);
          }
        } catch (_fErr) {}
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [activeEmergencyId]);

  const handleAccept = async () => {
    if (!activeEmergencyId) return;

    setAccepting(true);
    try {
      // Ensure driver is active/available
      await api.ambulances.updateAvailability('AVAILABLE').catch(() => {});

      // 1. Accept request and assign ambulance
      const res: any = await api.ambulances.acceptRequest(activeEmergencyId);
      const data = res?.data || res;
      const tripId = data?.tripId || `trip-${activeEmergencyId}`;

      setActiveTripId(tripId);
      setEmergencyId(activeEmergencyId);

      // 2. Transition trip to EN_ROUTE_TO_PATIENT
      try {
        await api.ambulances.startToPatient(tripId);
      } catch (_startErr) {
        // Non-fatal if already transitioned
      }

      router.replace('/(ambulance)/navigate-patient');
    } catch (err: any) {
      const errMsg =
        err?.message ||
        'This emergency dispatch may have already been claimed by another ambulance unit.';

      Alert.alert('Dispatch Already Claimed', errMsg, [
        {
          text: 'Return to Dashboard',
          onPress: () => router.replace('/(ambulance)/dashboard'),
        },
      ]);
    } finally {
      setAccepting(false);
    }
  };

  const sev = String(detail?.severity || 'HIGH').toUpperCase();
  const pillColor = (sev === 'CRITICAL' || sev === 'HIGH' ? 'red' : 'amber') as 'red' | 'amber';
  const incidentName = detail?.incidentType || 'Emergency Dispatch Alert';
  const loc = detail?.location;
  const locStr = loc
    ? `${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}`
    : 'GPS Shared';

  return (
    <Screen>
      <TopBar
        title="Dispatch Details"
        back={true}
        onPressBack={() => router.replace('/(ambulance)/dashboard')}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loadingText}>Fetching emergency dispatch...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Main Incident Card */}
          <Card style={styles.card}>
            <View style={styles.rowTop}>
              <Pill color={pillColor}>{sev} SEVERITY</Pill>
              <Text style={styles.etaText}>EST. ARRIVAL · ~6 MIN</Text>
            </View>
            <Text style={styles.name}>{incidentName}</Text>
            <Text style={styles.sub}>Pickup: {locStr}</Text>
          </Card>

          {/* Location & Incident Description */}
          <LabelEyebrow>INCIDENT DETAILS</LabelEyebrow>
          <Card style={styles.detailCard}>
            <Text style={styles.sectionLabel}>Reported Description:</Text>
            <Text style={styles.bodyText}>
              {detail?.description || detail?.voiceTranscript || 'Patient reported acute emergency in need of immediate EMS pickup.'}
            </Text>

            {detail?.aiResult?.recommendedHospital ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionLabel}>AI Recommended Destination:</Text>
                <Text style={styles.bodyHighlight}>{detail.aiResult.recommendedHospital}</Text>
              </View>
            ) : null}
          </Card>

          <View style={{ height: 20 }} />

          <Button
            title={accepting ? 'Claiming Dispatch...' : 'Accept Emergency Dispatch'}
            disabled={accepting}
            loading={accepting}
            onPress={handleAccept}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.red,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 11,
    color: colors.inkFaint,
    fontWeight: '700',
  },
  name: {
    fontWeight: '800',
    fontSize: 16,
    marginTop: 10,
    color: colors.ink,
  },
  sub: {
    fontSize: 12.5,
    color: colors.inkSoft,
    marginTop: 4,
    fontWeight: '600',
  },
  detailCard: {
    padding: 14,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  bodyHighlight: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.red,
    marginTop: 2,
  },
});

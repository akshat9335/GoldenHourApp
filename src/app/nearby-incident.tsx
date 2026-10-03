import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, LabelEyebrow, CommunityConfirmation, Button, openExternalNavigation } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function NearbyIncident() {
  const { emergencyId } = useLocalSearchParams<{ emergencyId?: string }>();
  const activeId = emergencyId || 'incident-demo-01';

  const [incidentData, setIncidentData] = useState<{
    incidentType?: string;
    description?: string;
    imageUrl?: string;
    location?: { latitude: number; longitude: number };
    status?: string;
    confirmationCount?: number;
  } | null>(null);

  const confirmationCount = useAppStore((s) => s.confirmationCount);
  const setConfirmationCount = useAppStore((s) => s.setConfirmationCount);
  const hasConfirmedIncident = useAppStore((s) => s.hasConfirmedIncident);
  const setHasConfirmedIncident = useAppStore((s) => s.setHasConfirmedIncident);
  const confirmIncident = useAppStore((s) => s.confirmIncident);

  useEffect(() => {
    let mounted = true;

    const loadIncident = async () => {
      let targetId = emergencyId;
      if (!targetId) {
        const storeLoc = useAppStore.getState().lastKnownLocation;
        if (storeLoc) {
          try {
            const list: any = await api.location.getNearbyIncidents(storeLoc.latitude, storeLoc.longitude, 15);
            if (list && list.length > 0) {
              targetId = list[0].incidentId;
            }
          } catch {}
        }
      }
      if (!targetId) return;

      api.emergencies
        .getById(targetId)
        .then((emg) => {
          if (mounted && emg) {
            setIncidentData(emg);
            if (typeof emg.confirmationCount === 'number') {
              setConfirmationCount(emg.confirmationCount);
            }
          }
        })
        .catch(() => {});

      api.confirmations
        .getMyStatus(targetId)
        .then((res: any) => {
          if (mounted && (res?.confirmed || res?.hasConfirmed)) {
            setHasConfirmedIncident(true);
          }
        })
        .catch(() => {});
    };

    loadIncident();

    return () => {
      mounted = false;
    };
  }, [emergencyId]);

  const handleConfirm = async () => {
    try {
      const storeLoc = useAppStore.getState().lastKnownLocation;
      await api.confirmations.confirm(activeId, {
        latitude: incidentData?.location?.latitude || storeLoc?.latitude || 25.4358,
        longitude: incidentData?.location?.longitude || storeLoc?.longitude || 81.8463,
      });
      confirmIncident();
      setConfirmationCount((c) => c + 1);
      Alert.alert('Confirmed', 'Thank you! Your community confirmation has been recorded.');
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('already')) {
        setHasConfirmedIncident(true);
        Alert.alert('Notice', 'You have already confirmed this emergency incident.');
      } else {
        Alert.alert('Notice', err?.message || 'Could not record confirmation.');
      }
    }
  };

  const incidentType = incidentData?.incidentType || 'ACCIDENT';
  const description = incidentData?.description || 'Not provided';
  const hasPhoto = !!incidentData?.imageUrl;
  const targetLat = incidentData?.location?.latitude || 25.4358;
  const targetLng = incidentData?.location?.longitude || 81.8463;

  return (
    <Screen>
      <TopBar title="Nearby Incident" />
      <Card style={styles.card}>
        <Pill color="orange">{incidentType.toUpperCase()} · HIGH</Pill>
        <Text style={styles.location}>
          {incidentData?.location ? `GPS: ${incidentData.location.latitude.toFixed(3)}°, ${incidentData.location.longitude.toFixed(3)}°` : 'Nearby in your vicinity'}
        </Text>
        <Text style={styles.time}>Reported recently · Live responders alerting</Text>
      </Card>

      <LabelEyebrow>DESCRIPTION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={styles.bodyText}>{description}</Text>
      </Card>

      <LabelEyebrow>PHOTO</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={hasPhoto ? styles.bodyText : styles.emptyText}>
          {hasPhoto ? 'Accident photo attached' : 'No photo provided'}
        </Text>
      </Card>

      <CommunityConfirmation count={confirmationCount} confirmed={hasConfirmedIncident} onConfirm={handleConfirm} />

      <View style={{ marginTop: 16, gap: 10 }}>
        <TouchableOpacity
          style={styles.gMapsBtn}
          onPress={() =>
            openExternalNavigation({
              destLat: targetLat,
              destLng: targetLng,
              destTitle: `Incident: ${incidentType}`,
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.gMapsBtnText}>🧭 Open Incident in Google Maps</Text>
        </TouchableOpacity>

        <Button
          title="Track Live on In-App Map →"
          variant="secondary"
          onPress={() => router.push(`/(patient)/live-map?emergencyId=${activeId}` as any)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16, gap: 6 },
  location: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 6 },
  time: { fontSize: 11, color: colors.inkFaint },
  textCard: { padding: 14, marginBottom: 16 },
  bodyText: { fontSize: 12.5, color: colors.inkSoft },
  emptyText: { fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic' },
  gMapsBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gMapsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

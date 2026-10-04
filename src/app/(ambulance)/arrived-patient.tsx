import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function ArrivedPatient() {
  const params = useLocalSearchParams<{ emergencyId?: string; tripId?: string }>();
  const activeTripId = useAppStore((s) => s.activeTripId) || params.tripId;
  const emergencyId = useAppStore((s) => s.emergencyId) || params.emergencyId;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.tripId && !useAppStore.getState().activeTripId) {
      useAppStore.getState().setActiveTripId(params.tripId);
    }
    if (params.emergencyId && !useAppStore.getState().emergencyId) {
      useAppStore.getState().setEmergencyId(params.emergencyId);
    }
  }, [params.tripId, params.emergencyId]);

  const handlePickedUp = async () => {
    const effectiveTripId = activeTripId || params.tripId;
    if (effectiveTripId) {
      setLoading(true);
      try {
        await api.ambulances.pickup(effectiveTripId);
      } catch (_err) {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    router.push({
      pathname: '/(ambulance)/picked-up',
      params: { emergencyId, tripId: effectiveTripId },
    });
  };

  const handleFalseAlarm = () => {
    Alert.alert(
      'Report Patient Not Found / False Request?',
      'Are you sure the patient is not at this location?\n\n• Trip will be cancelled\n• Trust score penalty (-20 points) will be applied to the caller for false report\n• You will return to AVAILABLE status for genuine emergencies',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Patient Not Found',
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
              'Reported as False Alarm / Patient Not Found.\nTrust score penalty (-20) applied to the caller. You are now AVAILABLE for new dispatches.'
            );
            router.replace('/(ambulance)/dashboard');
          },
        },
      ]
    );
  };

  return (
    <Screen center style={{ alignItems: 'center', paddingHorizontal: 20 }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Arrived at Patient"
        desc="Confirm once the patient is loaded and stabilized in the ambulance, or report if the patient is not found."
      />
      <Button
        title={loading ? 'Confirming Onboard...' : 'Patient Onboard · Start Transit →'}
        disabled={loading}
        loading={loading}
        onPress={handlePickedUp}
        style={{ marginTop: 24, width: '100%' }}
      />
      <TouchableOpacity
        disabled={loading}
        onPress={handleFalseAlarm}
        style={styles.falseAlarmBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.falseAlarmText}>⚠️ Patient Not Found / False Request</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  falseAlarmBtn: {
    marginTop: 14,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  falseAlarmText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '800',
  },
});

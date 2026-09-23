import React, { useState, useEffect } from 'react';
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

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Arrived at Patient"
        desc="Confirm once the patient is loaded and stabilized in the ambulance."
      />
      <Button
        title={loading ? 'Confirming Onboard...' : 'Patient Onboard · Start Transit'}
        disabled={loading}
        loading={loading}
        onPress={handlePickedUp}
        style={{ marginTop: 24, width: '100%' }}
      />
    </Screen>
  );
}

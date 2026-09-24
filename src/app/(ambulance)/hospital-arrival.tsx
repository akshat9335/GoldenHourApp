import React, { useState } from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function HospitalArrival() {
  const activeTripId = useAppStore((s) => s.activeTripId);
  const setActiveTripId = useAppStore((s) => s.setActiveTripId);
  const setEmergencyId = useAppStore((s) => s.setEmergencyId);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (activeTripId) {
      setLoading(true);
      try {
        await api.ambulances.completeTrip(activeTripId);
      } catch (_err) {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    setActiveTripId(null);
    setEmergencyId(null);
    await api.ambulances.updateAvailability('AVAILABLE').catch(() => {});
    router.replace('/(ambulance)/dashboard');
  };

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Handed Off to Hospital"
        desc="Patient transferred to trauma care. Emergency trip completed. Unit is now available for new dispatches."
      />
      <Button
        title={loading ? 'Completing Mission...' : 'Complete Mission & Return to Fleet'}
        disabled={loading}
        loading={loading}
        onPress={handleComplete}
        style={{ marginTop: 24, width: '100%' }}
      />
    </Screen>
  );
}

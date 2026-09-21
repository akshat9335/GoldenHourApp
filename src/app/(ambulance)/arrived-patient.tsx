import React, { useState } from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function ArrivedPatient() {
  const activeTripId = useAppStore((s) => s.activeTripId);
  const [loading, setLoading] = useState(false);

  const handlePickedUp = async () => {
    if (activeTripId) {
      setLoading(true);
      try {
        await api.ambulances.pickup(activeTripId);
      } catch (_err) {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    router.push('/(ambulance)/picked-up');
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

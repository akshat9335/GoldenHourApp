import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function Completed() {
  const emergencyId = useAppStore((s) => s.emergencyId);
  const resetEmergencySession = useAppStore((s) => s.resetEmergencySession);
  const [hospitalName, setHospitalName] = useState<string>('Emergency Trauma Hospital');

  useEffect(() => {
    if (emergencyId) {
      api.emergencies.getById(emergencyId).then((data) => {
        if (data?.assignedHospitalName) {
          setHospitalName(data.assignedHospitalName);
        }
      }).catch(() => {});
    }
    // Wipe active SOS session immediately so ETA, distance, and active banners disappear
    resetEmergencySession();
  }, []);

  const handleBackHome = () => {
    resetEmergencySession();
    router.replace('/(patient)/home');
  };

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={38} color={colors.success} />}
        bg={colors.successBg}
        size={88}
        title="Emergency Resolved"
        desc={`Patient safely arrived at ${hospitalName} · Emergency handoff completed.`}
      />
      <Button title="Back to Dashboard" onPress={handleBackHome} style={{ marginTop: 24, width: '100%' }} />
    </Screen>
  );
}

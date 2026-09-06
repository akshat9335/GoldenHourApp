import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalArrival() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Handed Off to Hospital"
        desc="Emergency completed. Unit is now available."
      />
      <Button title="Back to Dashboard" onPress={() => router.replace('/(ambulance)/dashboard')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

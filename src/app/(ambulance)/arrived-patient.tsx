import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function ArrivedPatient() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Arrived at Patient"
        desc="Confirm once the patient is loaded and secured."
      />
      <Button title="Patient Picked Up" onPress={() => router.push('/(ambulance)/picked-up')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

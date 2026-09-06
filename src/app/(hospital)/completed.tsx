import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalCompleted() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Emergency Completed"
        desc="Patient handed off to cardiac team at 9:58 PM."
      />
      <Button title="Back to Dashboard" onPress={() => router.replace('/(hospital)/dashboard')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

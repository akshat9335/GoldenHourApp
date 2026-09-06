import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalAccepted() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Emergency Accepted"
        desc="Trauma bay 2 reserved. Cardiac team notified."
      />
      <Button title="Mark Ready to Receive" onPress={() => router.push('/(hospital)/ready')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

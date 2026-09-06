import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalRejected() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="close" size={30} color={colors.redDark} />}
        bg="#FDECEC"
        title="Request Redirected"
        desc="The nearest alternate hospital has been notified instead."
      />
      <Button title="Back to Dashboard" onPress={() => router.replace('/(hospital)/dashboard')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

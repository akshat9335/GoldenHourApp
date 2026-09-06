import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function EmergencyStart() {
  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="ambulance" size={34} color={colors.red} />}
        bg={colors.redGlow}
        title="Starting an emergency"
        desc="Tell us what's happening so we can route the right help, fast."
        size={90}
      />
      <View style={{ height: 24 }} />
      <Button title="Continue" onPress={() => router.push('/(patient)/emergency/select-type')} />
    </Screen>
  );
}

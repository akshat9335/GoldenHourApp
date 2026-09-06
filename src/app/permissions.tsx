import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function Permissions() {
  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="pin" size={30} color={colors.blue} />}
        bg={colors.blueBg}
        title="Enable Location"
        desc="Golden Hour needs precise location to dispatch ambulances and share it with hospitals during an emergency."
      />
      <Button title="Allow Location Access" onPress={() => router.push('/permissions-notif')} style={{ marginTop: 24 }} />
      <Button title="Not Now" variant="ghost" onPress={() => router.push('/permissions-notif')} />
    </Screen>
  );
}

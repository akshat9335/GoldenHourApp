import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';
import { notificationService } from '@/services/notifications';

export default function PermissionsNotif() {
  const handleAllow = async () => {
    try {
      await notificationService.registerForPushNotificationsAsync();
    } catch (_err) {
      // safe fallback
    }
    router.push('/auth-success');
  };

  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="bell" size={26} color={colors.amber} />}
        bg={colors.amberBg}
        title="Enable Notifications"
        desc="Get real-time updates on ambulance status, hospital acceptance, and emergency contact confirmations."
      />
      <Button title="Allow Notifications" onPress={handleAllow} style={{ marginTop: 24 }} />
      <Button title="Not Now" variant="ghost" onPress={() => router.push('/auth-success')} />
    </Screen>
  );
}

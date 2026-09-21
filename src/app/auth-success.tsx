import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon, IdentitySafetyCard } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';
import { notificationService } from '@/services/notifications';

export default function AuthSuccess() {
  const goldenHourId = useAppStore((s) => s.goldenHourId);
  const trustScore = useAppStore((s) => s.trustScore);

  useEffect(() => {
    // Sync full profile (crisisId, roles, trustScore etc.)
    authService.syncProfile().catch(() => {});
    // Re-register FCM token now that user is authenticated
    // This guarantees fcmToken is saved to Firestore on every login
    notificationService.registerForPushNotificationsAsync().catch(() => {});
  }, []);
  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="check" size={38} color={colors.success} />}
        bg={colors.successBg}
        title="You're all set"
        desc="Your profile and emergency readiness are complete."
        size={88}
      />
      <IdentitySafetyCard goldenHourId={goldenHourId} trustScore={trustScore} />
      <Button title="Go to Dashboard" onPress={() => router.replace('/(patient)/home')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

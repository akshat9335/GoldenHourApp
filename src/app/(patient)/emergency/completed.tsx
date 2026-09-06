import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function Completed() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={38} color={colors.success} />}
        bg={colors.successBg}
        size={88}
        title="Emergency Completed"
        desc="Patient arrived at St. Martha's Hospital · Total time 21 min"
      />
      <Button title="View Summary" onPress={() => router.push('/history-detail')} style={{ marginTop: 22 }} />
      <Button title="Back to Home" variant="ghost" onPress={() => router.replace('/(patient)/home')} />
    </Screen>
  );
}

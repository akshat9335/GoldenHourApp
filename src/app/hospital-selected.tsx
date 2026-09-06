import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalSelected() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Hospital Selected"
        desc="St. Martha's Hospital will be notified when you confirm your emergency."
      />
      <Button title="Done" onPress={() => router.replace('/(patient)/home')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

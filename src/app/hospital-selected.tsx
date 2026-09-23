import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalSelected() {
  const { hospitalName } = useLocalSearchParams<{ hospitalName?: string }>();
  const name = hospitalName || 'Emergency trauma hospital';

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Hospital Selected"
        desc={`${name} will be notified and placed on standby when emergency response confirms.`}
      />
      <Button title="Done" onPress={() => router.replace('/(patient)/home')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

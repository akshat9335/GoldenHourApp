import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function AiNetworkError() {
  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="wifiOff" size={20} color={colors.redDark} />}
        bg="#FDECEC"
        title="Network Error"
        desc="Couldn't reach Golden Hour servers. Your location is still being tracked locally."
      />
      <Button title="Retry" onPress={() => router.push('/(patient)/emergency/ai-analyzing')} style={{ marginTop: 20 }} />
      <Button title="Skip AI — Continue" variant="ghost" onPress={() => router.push('/(patient)/emergency/review')} />
    </Screen>
  );
}

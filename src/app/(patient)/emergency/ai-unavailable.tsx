import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function AiUnavailable() {
  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="ai" size={30} color={colors.amber} />}
        bg={colors.amberBg}
        title="AI Assistant Unavailable"
        desc="We couldn't reach the assessment service. You can still start an emergency directly."
      />
      <Button title="Continue Without AI" onPress={() => router.push('/(patient)/emergency/review')} style={{ marginTop: 20 }} />
      <Button title="Try Again" variant="ghost" onPress={() => router.push('/(patient)/emergency/ai-symptom-input')} />
    </Screen>
  );
}

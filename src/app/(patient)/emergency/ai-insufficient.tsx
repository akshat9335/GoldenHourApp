import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function AiInsufficient() {
  return (
    <Screen center>
      <IconPrompt
        icon={<Icon name="ai" size={28} color={colors.blue} />}
        bg={colors.blueBg}
        title="More information needed"
        desc="Add a bit more detail about the symptoms so we can assess severity accurately."
      />
      <Button title="Add Details" onPress={() => router.push('/(patient)/emergency/ai-symptom-input')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

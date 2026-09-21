import React from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function Activated() {
  const setAmbStatus = useAppStore((s) => s.setAmbStatus);
  React.useEffect(() => {
    setAmbStatus(0);
    const timer = setTimeout(() => {
      router.replace('/(patient)/emergency/active');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={38} color={colors.success} />}
        bg={colors.successBg}
        size={90}
        title="Emergency Activated"
        desc="Ambulance dispatched · Hospital alerted · 2 contacts notified"
      />
      <Button
        title="View Live Status"
        onPress={() => router.replace('/(patient)/emergency/active')}
        style={{ marginTop: 22 }}
      />
      <Button
        title="🤖 AI First-Aid Guidance (Do's & Don'ts)"
        variant="secondary"
        onPress={() => router.push('/(patient)/emergency/ai-actions')}
        style={{ marginTop: 10 }}
      />
    </Screen>
  );
}

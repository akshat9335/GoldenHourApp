import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, SosHold, HTitle } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { triggerCanonicalEmergencySOS } from '@/services/emergency';

export default function HoldConfirm() {
  const handleConfirm = () => {
    // Immediate zero-latency transition on 3.0s completion
    router.replace('/(patient)/emergency/activated');
    triggerCanonicalEmergencySOS().catch(() => {});
  };

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <HTitle size={17}>Hold to Confirm</HTitle>
      <Text style={styles.sub}>Keep holding for 3 seconds to dispatch help</Text>
      <SosHold
        label="HOLD"
        sublabel="TO DISPATCH"
        onConfirm={handleConfirm}
      />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 22, width: 'auto' }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkFaint, fontSize: 11.5, marginBottom: 10 },
});

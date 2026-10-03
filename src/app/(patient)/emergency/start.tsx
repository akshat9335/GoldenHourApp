import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function EmergencyStart() {
  const role = useAppStore((s) => s.role);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (role === 'FRONTLINE_WORKER') {
      router.replace('/(worker)/dashboard' as any);
    } else {
      router.replace('/(patient)/home');
    }
  };

  return (
    <Screen center>
      <View style={{ position: 'absolute', top: 20, left: 16, zIndex: 10 }}>
        <TouchableOpacity
          onPress={handleBack}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.inkSoft }}>‹ Back</Text>
        </TouchableOpacity>
      </View>
      <IconPrompt
        icon={<Icon name="ambulance" size={34} color={colors.red} />}
        bg={colors.redGlow}
        title="Starting an emergency"
        desc="Tell us what's happening so we can route the right help, fast."
        size={90}
      />
      <View style={{ height: 24 }} />
      <Button title="Continue" onPress={() => router.push('/(patient)/emergency/select-type')} />
    </Screen>
  );
}

import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';

export default function HospitalAccepted() {
  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={30} color={colors.success} />}
        bg={colors.successBg}
        title="Emergency Accepted"
        desc="Trauma bay 2 reserved. Cardiac team notified."
      />
      <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
        <Button
          title="Monitor on Hospital Dashboard →"
          onPress={() => router.replace('/(hospital)/dashboard')}
        />
        <Button
          title="View Patient Dossier"
          variant="secondary"
          onPress={() => router.replace('/(hospital)/request-detail')}
        />
      </View>
    </Screen>
  );
}

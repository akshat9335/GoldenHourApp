import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon } from '@/components/ui';

export default function DriverRegister() {
  return (
    <Screen>
      <TopBar title="Driver Registration" />
      <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
        Verification required. Your driver and ambulance details will be checked before your account is activated.
      </Banner>
      <View style={{ height: 16 }} />
      <InputGroup label="Driver Name"><Input placeholder="Full name" /></InputGroup>
      <InputGroup label="Email"><Input placeholder="you@example.com" keyboardType="email-address" /></InputGroup>
      <InputGroup label="Phone"><Input placeholder="+91 98765 43210" keyboardType="phone-pad" /></InputGroup>
      <InputGroup label="Driver ID"><Input placeholder="e.g. AMB-014" /></InputGroup>
      <InputGroup label="Ambulance ID"><Input placeholder="e.g. KA-05-AB" /></InputGroup>
      <InputGroup label="Password"><Input placeholder="Create a password" secureTextEntry /></InputGroup>
      <InputGroup label="Confirm Password"><Input placeholder="Re-enter password" secureTextEntry /></InputGroup>
      <Button title="Submit for Verification" onPress={() => router.replace('/driver-login')} />
    </Screen>
  );
}

import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon } from '@/components/ui';

export default function HospitalRegister() {
  return (
    <Screen>
      <TopBar title="Hospital Registration" />
      <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
        Verification required. Your hospital details will be checked before your account is activated.
      </Banner>
      <View style={{ height: 16 }} />
      <InputGroup label="Hospital Name"><Input placeholder="e.g. St. Martha's Hospital" /></InputGroup>
      <InputGroup label="Hospital Email"><Input placeholder="admin@hospital.com" keyboardType="email-address" /></InputGroup>
      <InputGroup label="Phone Number"><Input placeholder="+91 98765 43210" keyboardType="phone-pad" /></InputGroup>
      <InputGroup label="Registration / Hospital ID"><Input placeholder="Government Hospital Reg. No." /></InputGroup>
      <InputGroup label="Address"><Input placeholder="Full hospital address" multiline /></InputGroup>
      <InputGroup label="Password"><Input placeholder="Create a password" secureTextEntry /></InputGroup>
      <InputGroup label="Confirm Password"><Input placeholder="Re-enter password" secureTextEntry /></InputGroup>
      <Button title="Submit for Verification" onPress={() => router.replace('/hospital-login')} />
    </Screen>
  );
}

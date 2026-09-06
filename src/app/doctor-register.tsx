import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon } from '@/components/ui';

export default function DoctorRegister() {
  return (
    <Screen>
      <TopBar title="Doctor Registration" />
      <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
        Verification required. Your Medical Registration Number will be checked before your profile goes live to patients.
      </Banner>
      <View style={{ height: 16 }} />
      <InputGroup label="Full Name"><Input placeholder="Dr. Full Name" /></InputGroup>
      <InputGroup label="Email"><Input placeholder="you@example.com" keyboardType="email-address" /></InputGroup>
      <InputGroup label="Phone"><Input placeholder="+91 98765 43210" keyboardType="phone-pad" /></InputGroup>
      <InputGroup label="Specialization"><Input placeholder="e.g. Cardiologist" /></InputGroup>
      <InputGroup label="Qualification"><Input placeholder="e.g. MBBS, MD" /></InputGroup>
      <InputGroup label="Medical Registration Number"><Input placeholder="State Medical Council Reg. No." /></InputGroup>
      <InputGroup label="Clinic Name"><Input placeholder="e.g. Sharma Heart Clinic" /></InputGroup>
      <InputGroup label="Clinic Address"><Input placeholder="Full clinic address" multiline /></InputGroup>
      <InputGroup label="Consultation Fee (₹)"><Input placeholder="e.g. 500" keyboardType="number-pad" /></InputGroup>
      <Button title="Submit for Verification" onPress={() => router.replace('/doctor-login')} />
    </Screen>
  );
}

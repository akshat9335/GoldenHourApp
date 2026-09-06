import React from 'react';
import { router } from 'expo-router';
import { Screen, TopBar, Button, Input, InputGroup } from '@/components/ui';

export default function CreateAccount() {
  return (
    <Screen>
      <TopBar title="Create Account" />
      <InputGroup label="Full Name"><Input placeholder="e.g. Akshat Srivastava" /></InputGroup>
      <InputGroup label="Email"><Input placeholder="you@example.com" keyboardType="email-address" /></InputGroup>
      <InputGroup label="Date of Birth"><Input placeholder="DD / MM / YYYY" /></InputGroup>
      <Button title="Continue" onPress={() => router.push('/profile-basic')} />
    </Screen>
  );
}

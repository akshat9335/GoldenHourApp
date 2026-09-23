import React, { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar, Button, Input, InputGroup } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function CreateAccount() {
  const userProfile = useAppStore((s) => s.userProfile);
  const draft = useAppStore((s) => s.registrationDraft);
  const setDraft = useAppStore((s) => s.setRegistrationDraft);

  const [name, setName] = useState(draft.name || userProfile?.name || '');
  const [email, setEmail] = useState(draft.email || userProfile?.email || '');
  const [phone, setPhone] = useState(draft.phone || '');
  const [dob, setDob] = useState(draft.dateOfBirth || '');

  const handleContinue = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your full name to create your account.');
      return;
    }

    setDraft({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dateOfBirth: dob.trim(),
      role: 'PATIENT',
    });

    router.push('/profile-basic');
  };

  return (
    <Screen>
      <TopBar title="Create Account" />
      <InputGroup label="Full Name">
        <Input
          placeholder="e.g. Akshat Srivastava"
          value={name}
          onChangeText={setName}
        />
      </InputGroup>
      <InputGroup label="Email">
        <Input
          placeholder="you@example.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </InputGroup>
      <InputGroup label="Phone Number">
        <Input
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </InputGroup>
      <InputGroup label="Date of Birth">
        <Input
          placeholder="DD / MM / YYYY"
          value={dob}
          onChangeText={setDob}
        />
      </InputGroup>
      <Button title="Continue" onPress={handleContinue} />
    </Screen>
  );
}


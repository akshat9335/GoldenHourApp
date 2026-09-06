import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar, Button, Input, InputGroup, Chip, Banner, Icon } from '@/components/ui';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function MedicalSetup() {
  const [blood, setBlood] = useState('O+');
  return (
    <Screen>
      <TopBar title="Medical Information" />
      <Banner color="blue" icon={<Icon name="check" size={14} color="#1565C0" />}>
        Shown to first responders only during an active SOS event.
      </Banner>
      <View style={{ height: 16 }} />
      <InputGroup label="Blood Group">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BLOOD_GROUPS.map((b) => (
            <Chip key={b} label={b} selected={blood === b} onPress={() => setBlood(b)} />
          ))}
        </View>
      </InputGroup>
      <InputGroup label="Known Allergies"><Input defaultValue="Penicillin, Peanuts" /></InputGroup>
      <InputGroup label="Current Medications"><Input placeholder="None" /></InputGroup>
      <InputGroup label="Chronic Conditions"><Input defaultValue="Asthma — mild" /></InputGroup>
      <Button title="Continue" onPress={() => router.push('/contacts-setup')} />
    </Screen>
  );
}

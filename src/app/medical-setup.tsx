import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar, Button, Input, InputGroup, Chip, Banner, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function MedicalSetup() {
  const draft = useAppStore((s) => s.registrationDraft);
  const setDraft = useAppStore((s) => s.setRegistrationDraft);

  const [blood, setBlood] = useState(draft.bloodGroup || 'O+');
  const [allergies, setAllergies] = useState(
    Array.isArray(draft.allergies) ? draft.allergies.join(', ') : (draft.allergies ?? 'Penicillin, Peanuts')
  );
  const [medications, setMedications] = useState(
    Array.isArray(draft.currentMedications)
      ? draft.currentMedications.join(', ')
      : (draft.currentMedications ?? '')
  );
  const [conditions, setConditions] = useState(
    Array.isArray(draft.chronicConditions)
      ? draft.chronicConditions.join(', ')
      : (draft.chronicConditions ?? 'Asthma — mild')
  );

  const handleContinue = () => {
    const parseList = (str: string) =>
      str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    setDraft({
      bloodGroup: blood,
      allergies: parseList(allergies),
      currentMedications: parseList(medications),
      chronicConditions: parseList(conditions),
    });

    router.push('/contacts-setup');
  };

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
      <InputGroup label="Known Allergies">
        <Input
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. Penicillin, Peanuts"
        />
      </InputGroup>
      <InputGroup label="Current Medications">
        <Input
          value={medications}
          onChangeText={setMedications}
          placeholder="None, or e.g. Inhaler"
        />
      </InputGroup>
      <InputGroup label="Chronic Conditions">
        <Input
          value={conditions}
          onChangeText={setConditions}
          placeholder="e.g. Asthma, Diabetes"
        />
      </InputGroup>
      <Button title="Continue" onPress={handleContinue} />
    </Screen>
  );
}


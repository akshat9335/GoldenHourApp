import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Chip, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function ProfileBasic() {
  const draft = useAppStore((s) => s.registrationDraft);
  const setDraft = useAppStore((s) => s.setRegistrationDraft);

  const [gender, setGender] = useState(draft.gender || 'Male');
  const [age, setAge] = useState(draft.age ? String(draft.age) : '29');
  const [address, setAddress] = useState(draft.homeAddress || draft.address || '');

  const handleContinue = () => {
    setDraft({
      gender,
      age: parseInt(age, 10) || 29,
      homeAddress: address.trim(),
      address: address.trim(),
    });
    router.push('/medical-setup');
  };

  return (
    <Screen>
      <TopBar title="Basic Profile" />
      <View style={styles.avatar}>
        <Icon name="profile" size={30} color={colors.blue} />
      </View>
      <InputGroup label="Gender">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Male', 'Female', 'Other'].map((g) => (
            <Chip key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>
      </InputGroup>
      <InputGroup label="Age">
        <Input
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
        />
      </InputGroup>
      <InputGroup label="Home Address">
        <Input
          placeholder="Street, City, State"
          value={address}
          onChangeText={setAddress}
        />
      </InputGroup>
      <Button title="Continue" onPress={handleContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.blueBg,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});


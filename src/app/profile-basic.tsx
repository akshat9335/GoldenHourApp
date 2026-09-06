import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Chip, Icon } from '@/components/ui';

export default function ProfileBasic() {
  const [gender, setGender] = useState('Male');
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
      <InputGroup label="Age"><Input defaultValue="29" keyboardType="number-pad" /></InputGroup>
      <InputGroup label="Home Address"><Input placeholder="Street, City, State" /></InputGroup>
      <Button title="Continue" onPress={() => router.push('/medical-setup')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blueBg, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
});

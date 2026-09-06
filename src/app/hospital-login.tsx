import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, Input, InputGroup, Icon, HTitle } from '@/components/ui';

export default function HospitalLogin() {
  return (
    <Screen center>
      <View style={{ alignItems: 'center', marginBottom: 26 }}>
        <Icon name="hospital" size={34} color={colors.red} />
        <HTitle size={19}>Hospital Console</HTitle>
        <Text style={styles.sub}>St. Martha's Hospital — Emergency Desk</Text>
      </View>
      <InputGroup label="Hospital Email"><Input defaultValue="admin@stmartha.hospital.com" keyboardType="email-address" /></InputGroup>
      <InputGroup label="Password"><Input defaultValue="••••••••" secureTextEntry /></InputGroup>
      <Button title="Login" onPress={() => router.replace('/(hospital)/dashboard')} />
      <Button title="Register Hospital" variant="secondary" style={{ marginTop: 10 }} onPress={() => router.push('/hospital-register')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12, marginTop: 6 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, Input, InputGroup, Icon, HTitle } from '@/components/ui';

export default function DriverLogin() {
  return (
    <Screen center>
      <View style={{ alignItems: 'center', marginBottom: 26 }}>
        <Icon name="ambulance" size={36} color={colors.red} />
        <HTitle size={19}>Ambulance Crew App</HTitle>
        <Text style={styles.sub}>Unit KA-05-AB</Text>
      </View>
      <InputGroup label="Email"><Input defaultValue="driver.amb014@goldenhour.app" keyboardType="email-address" /></InputGroup>
      <InputGroup label="Password"><Input defaultValue="••••••••" secureTextEntry /></InputGroup>
      <Button title="Login" onPress={() => router.replace('/(ambulance)/dashboard')} />
      <Button title="Register as Driver" variant="secondary" style={{ marginTop: 10 }} onPress={() => router.push('/driver-register')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12, marginTop: 6 },
});

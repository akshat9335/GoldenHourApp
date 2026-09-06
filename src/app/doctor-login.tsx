import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, Input, InputGroup, Icon, HTitle } from '@/components/ui';

export default function DoctorLogin() {
  return (
    <Screen center>
      <View style={{ alignItems: 'center', marginBottom: 26 }}>
        <Icon name="doctor" size={36} color={colors.red} />
        <HTitle size={19}>Doctor Console</HTitle>
        <Text style={styles.sub}>Sharma Heart Clinic — Consultation Desk</Text>
      </View>
      <InputGroup label="Email / Phone"><Input defaultValue="dr.rahul@goldenhour.app" /></InputGroup>
      <InputGroup label="Password"><Input defaultValue="••••••••" secureTextEntry /></InputGroup>
      <Button title="Login" onPress={() => router.replace('/(doctor)/dashboard')} />
      <Button title="Create Doctor Account" variant="secondary" style={{ marginTop: 10 }} onPress={() => router.push('/doctor-register')} />
      <Text style={styles.forgot}>Forgot Password?</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12, marginTop: 6, textAlign: 'center' },
  forgot: { color: colors.blue, fontSize: 12.5, fontWeight: '600', textAlign: 'center', marginTop: 16 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, Input, InputGroup, HTitle } from '@/components/ui';

export default function Login() {
  return (
    <Screen center>
      <View style={{ alignItems: 'center', marginBottom: 30 }}>
        <HTitle size={21}>Welcome back</HTitle>
        <Text style={styles.sub}>Sign in to access your emergency profile</Text>
      </View>
      <InputGroup label="Mobile Number">
        <Input value="+91 98765 43210" editable={false} />
      </InputGroup>
      <Button title="Send OTP" onPress={() => router.push('/otp')} />
      <Text style={styles.or}>or continue with</Text>
      <Button title="Create New Account" variant="secondary" onPress={() => router.push('/create-account')} />
      <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12.5, marginTop: 6 },
  or: { textAlign: 'center', marginVertical: 16, color: colors.inkFaint, fontSize: 11.5 },
  terms: { textAlign: 'center', marginTop: 22, fontSize: 11, color: colors.inkFaint },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button } from '@/components/ui';
import { authService } from '@/services/auth';

const DIGITS = ['6', '2', '9', '1', '0', '4'];

export default function Otp() {
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    // Phone OTP is deferred to subsequent Android Phone Auth configuration module
    router.replace('/login');
  };

  return (
    <Screen>
      <TopBar title="Verify OTP" />
      <Text style={styles.sub}>Enter the 6-digit code sent to +91 98765 43210</Text>
      <View style={styles.boxes}>
        {DIGITS.map((d, i) => (
          <View key={i} style={[styles.box, d ? { borderColor: colors.red } : null]}>
            <Text style={styles.boxText}>{d}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.resend}>Resend code in <Text style={{ color: colors.ink, fontWeight: '700' }}>00:24</Text></Text>
      <Button title={loading ? "Verifying…" : "Verify"} onPress={handleVerify} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12.5, marginBottom: 22 },
  boxes: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  box: { width: 44, height: 52, borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  boxText: { fontWeight: '700', fontSize: 18, color: colors.ink },
  resend: { fontSize: 12, color: colors.inkFaint, marginBottom: 22 },
});

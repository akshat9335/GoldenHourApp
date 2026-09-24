import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Screen, Button, Icon, HTitle, Banner } from '@/components/ui';
import { authService } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';

export default function DriverLogin() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setPendingStatus(null);
    try {
      const session = await authService.promptGoogleSignIn();

      const userRoles = (session.profile?.roles || [session.role || 'PATIENT']).map((r: string) => r.toUpperCase());
      const isDriver = userRoles.includes('AMBULANCE_DRIVER') || userRoles.includes('AMBULANCE');

      if (!session.profileExists || !isDriver) {
        Alert.alert(
          'Registration Required',
          `The Google account (${session.email}) is not registered as an Ambulance Driver.\n\nPlease submit an application to join the Golden Hour Emergency Fleet.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Now', onPress: () => router.push('/driver-register') },
          ]
        );
        return;
      }

      const status = (session.profile?.verificationStatus || session.profile?.roleVerificationStatus?.AMBULANCE_DRIVER || 'PENDING').toUpperCase();

      if (status === 'PENDING') {
        setPendingStatus('Your driver application is currently pending admin review. You will receive emergency alerts once your license and vehicle details are approved.');
        Alert.alert('Verification Pending', 'Your application is awaiting Admin verification. You cannot access the dispatch dashboard until approved.');
        return;
      }

      if (status === 'REJECTED') {
        Alert.alert('Application Rejected', 'Your driver registration was rejected by the Medical Admin. Please contact support or register again.');
        return;
      }

      useAppStore.getState().setRole('AMBULANCE_DRIVER');
      useAppStore.getState().setVerificationStatus('APPROVED');
      router.replace('/(ambulance)/dashboard');
      return;
    } catch (err: any) {
      console.warn('[DriverLogin] Google Sign-In error:', err);
      const msg = err?.message || 'Failed to sign in. Please try again.';
      if (!msg.includes('cancelled') && !msg.includes('dismissed')) {
        Alert.alert('Sign In Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <Pressable
        onPress={() => router.replace('/role-selection')}
        style={{ position: 'absolute', top: Math.max(insets.top, 16) + 6, left: 16, zIndex: 10, padding: 8 }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkSoft }}>‹ Back</Text>
      </Pressable>

      <View style={{ alignItems: 'center', marginBottom: 26, marginTop: 40 }}>
        <View style={styles.iconCircle}>
          <Icon name="ambulance" size={36} color={colors.red} />
        </View>
        <HTitle size={20}>Ambulance Crew Console</HTitle>
        <Text style={styles.sub}>Emergency Fleet & Dispatch Network</Text>
      </View>

      {pendingStatus && (
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
            Application Submitted — Verification Pending
          </Banner>
          <Text style={styles.pendingDesc}>{pendingStatus}</Text>
        </View>
      )}

      <Button
        title={loading ? "Verifying Driver Credentials…" : "Sign In with Google"}
        onPress={handleGoogleSignIn}
        disabled={loading}
      />

      <Button
        title="Register as Ambulance Driver"
        variant="secondary"
        style={{ marginTop: 12 }}
        onPress={() => router.push('/driver-register')}
      />

      <Pressable onPress={() => router.replace('/role-selection')} style={{ marginTop: 24 }}>
        <Text style={styles.backLink}>← Return to Role Selection</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.redGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sub: { color: colors.inkSoft, fontSize: 12.5, marginTop: 4, textAlign: 'center' },
  pendingDesc: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 8,
    lineHeight: 18,
    textAlign: 'center',
  },
  backLink: { color: colors.blue, fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
});

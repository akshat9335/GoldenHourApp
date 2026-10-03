import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Screen, Button, Icon, HTitle, Banner } from '@/components/ui';
import { authService } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '@/services/api';
import LanguageSelector from '@/components/LanguageSelector';

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
      useAppStore.getState().setRoles(Array.from(new Set([...userRoles, 'AMBULANCE_DRIVER'])) as any);
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

  const handleDemoDriver = async () => {
    try { await authService.signOut(); } catch {}
    setAuthToken('demo-token-driver');
    const profile = {
      uid: 'driver-demo-ramesh',
      name: 'Pilot Ramesh Kumar',
      driverName: 'Pilot Ramesh Kumar',
      email: 'ramesh.als108@goldenhour.org',
      phone: '+91 98765 43210',
      role: 'AMBULANCE_DRIVER',
      roles: ['AMBULANCE_DRIVER'],
      ambulanceId: 'Unit UP-70-AMB-108',
      vehiclePlateNumber: 'UP-70-EMG-108',
      ambulanceType: 'Advanced Life Support (ALS)',
      hospitalId: 'hosp-demo-apollo',
      hospitalName: 'Apollo Multi-Specialty Hospital',
      verificationStatus: 'APPROVED',
      isPhoneVerified: true,
      hasCompletedProfile: true,
    };
    try {
      await AsyncStorage.setItem('gh_auth_token', 'demo-token-driver');
      await AsyncStorage.setItem('gh_user_uid', 'driver-demo-ramesh');
      await AsyncStorage.setItem('gh_user_profile', JSON.stringify(profile));
    } catch {}
    useAppStore.getState().setRole('AMBULANCE_DRIVER');
    useAppStore.getState().setRoles(['AMBULANCE_DRIVER']);
    useAppStore.getState().setVerificationStatus('APPROVED');
    useAppStore.getState().setUserProfile(profile as any);
    useAppStore.getState().setIsAuthenticated(true);
    useAppStore.getState().setProfileExists(true);
    router.replace('/(ambulance)/dashboard');
  };

  return (
    <Screen center>
      <Pressable
        onPress={() => router.replace('/role-selection')}
        style={{ position: 'absolute', top: Math.max(insets.top, 16) + 6, left: 16, zIndex: 10, padding: 8 }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkSoft }}>‹ Back</Text>
      </Pressable>

      <View style={{ position: 'absolute', top: Math.max(insets.top, 16) + 6, right: 16, zIndex: 10 }}>
        <LanguageSelector />
      </View>

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
        title="⚡ 1-Click Demo Access (Pilot Ramesh - ALS)"
        variant="secondary"
        style={{ marginTop: 12, borderColor: '#16A34A', borderWidth: 1 }}
        onPress={handleDemoDriver}
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

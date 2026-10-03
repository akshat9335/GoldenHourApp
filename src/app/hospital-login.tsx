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

export default function HospitalLogin() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setPendingStatus(null);
    try {
      const session = await authService.promptGoogleSignIn();

      const rawRoles = (session.profile?.roles || [session.role || 'PATIENT']).map((r: string) => String(r).toUpperCase());
      const hasHospitalRole = rawRoles.includes('HOSPITAL');

      if (!session.profileExists || !hasHospitalRole) {
        Alert.alert(
          'Registration Required',
          `The Google account (${session.email}) is not registered as an Emergency Hospital Facility.\n\nPlease submit an application to register your emergency desk.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Hospital', onPress: () => router.push('/hospital-register') },
          ]
        );
        return;
      }

      const status = (session.profile?.verificationStatus || session.profile?.roleVerificationStatus?.HOSPITAL || 'PENDING').toUpperCase();

      if (status === 'PENDING') {
        setPendingStatus('Your hospital registration is currently pending admin review. You will be activated once facility license and capacity details are verified.');
        Alert.alert('Verification Pending', 'Your facility registration is awaiting Admin verification. You cannot access the hospital console until approved.');
        return;
      }

      if (status === 'REJECTED') {
        Alert.alert('Application Rejected', 'Your hospital application was rejected by the Medical Admin. Please contact support or re-register with valid credentials.');
        return;
      }

      // Hydrate official hospital facility name
      const officialName = session.profile?.hospitalName || 'Emergency Trauma Center';
      const updatedProfile = {
        ...session.profile,
        hospitalName: officialName,
        name: session.profile?.name || officialName,
        role: 'HOSPITAL',
      };
      useAppStore.getState().setIsDemoMode(false);
      useAppStore.getState().setUserProfile(updatedProfile);
      useAppStore.getState().setRole('HOSPITAL');
      useAppStore.getState().setRoles(Array.from(new Set([...rawRoles, 'HOSPITAL'])) as any);
      useAppStore.getState().setVerificationStatus('APPROVED');
      AsyncStorage.setItem('gh_user_profile', JSON.stringify(updatedProfile)).catch(() => {});
      router.replace('/(hospital)/dashboard');
      return;
    } catch (err: any) {
      console.warn('[HospitalLogin] Google Sign-In error:', err);
      const msg = err?.message || 'Failed to sign in. Please try again.';
      if (!msg.includes('cancelled') && !msg.includes('dismissed')) {
        Alert.alert('Sign In Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoHospital = async () => {
    try { await authService.signOut(); } catch {}
    setAuthToken('demo-token-hospital');
    const profile = {
      uid: 'hosp-demo-apollo',
      name: 'Dr. Apollo Desk Admin',
      hospitalName: 'Apollo Multi-Specialty Hospital',
      email: 'er.command@apollohospitals.com',
      phone: '+91 532 246 0108',
      role: 'HOSPITAL',
      roles: ['HOSPITAL'],
      verificationStatus: 'APPROVED',
      isPhoneVerified: true,
      hasCompletedProfile: true,
      totalBeds: 50,
      availableBeds: 18,
      icuBeds: 12,
      availableIcuBeds: 4,
    };
    try {
      await AsyncStorage.setItem('gh_auth_token', 'demo-token-hospital');
      await AsyncStorage.setItem('gh_user_uid', 'hosp-demo-apollo');
      await AsyncStorage.setItem('gh_user_profile', JSON.stringify(profile));
    } catch {}
    useAppStore.getState().setIsDemoMode(true);
    useAppStore.getState().setRole('HOSPITAL');
    useAppStore.getState().setRoles(['HOSPITAL']);
    useAppStore.getState().setVerificationStatus('APPROVED');
    useAppStore.getState().setUserProfile(profile as any);
    useAppStore.getState().setIsAuthenticated(true);
    useAppStore.getState().setProfileExists(true);
    router.replace('/(hospital)/dashboard');
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
          <Icon name="hospital" size={36} color={colors.red} />
        </View>
        <HTitle size={20}>Hospital Emergency Console</HTitle>
        <Text style={styles.sub}>Emergency Desk & Capacity Management</Text>
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
        title={loading ? "Verifying Hospital Credentials…" : "Sign In with Google"}
        onPress={handleGoogleSignIn}
        disabled={loading}
      />

      <Button
        title="⚡ 1-Click Demo Access (Apollo ER Desk)"
        variant="secondary"
        style={{ marginTop: 12, borderColor: '#16A34A', borderWidth: 1 }}
        onPress={handleDemoHospital}
      />

      <Button
        title="Register Hospital"
        variant="secondary"
        style={{ marginTop: 12 }}
        onPress={() => router.push('/hospital-register')}
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


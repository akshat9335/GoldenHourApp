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

export default function DoctorLogin() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setPendingStatus(null);
    try {
      const session = await authService.promptGoogleSignIn();

      const userRoles = (session.profile?.roles || [session.role || 'PATIENT']).map((r: string) => r.toUpperCase());
      const isDoctor = userRoles.includes('DOCTOR');

      if (!session.profileExists || !isDoctor) {
        Alert.alert(
          'Doctor Registration Required',
          `No Doctor profile is registered for ${session.email || 'this Google account'}. Please complete your doctor registration first with your medical registration number and clinic details.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register Now',
              onPress: () => router.push('/doctor-register'),
            },
          ]
        );
        return;
      }

      const status = session.profile?.roleVerificationStatus?.DOCTOR || session.profile?.verificationStatus || 'PENDING';
      const isApproved = status === 'APPROVED' || status === 'VERIFIED';

      if (!isApproved) {
        setPendingStatus(
          `Your registration for Dr. ${session.profile?.name || ''} is currently under administrative review. Please wait for approval.`
        );
        return;
      }

      useAppStore.getState().setRole('DOCTOR');
      useAppStore.getState().setRoles(Array.from(new Set([...userRoles, 'DOCTOR'])) as any);
      useAppStore.getState().setVerificationStatus('APPROVED');
      router.replace('/(doctor)/dashboard');
      return;
    } catch (err: any) {
      console.warn('[DoctorLogin] Google Sign-In error:', err);
      const msg = err?.message || 'Failed to sign in. Please try again.';
      if (!msg.includes('cancelled') && !msg.includes('dismissed')) {
        Alert.alert('Sign In Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoDoctor = async () => {
    try { await authService.signOut(); } catch {}
    setAuthToken('demo-token-doctor');
    const profile = {
      uid: 'doc-1',
      doctorId: 'doc-1',
      name: 'Dr. Alok Tripathi',
      doctorName: 'Dr. Alok Tripathi',
      email: 'dr.alok@medanta.org',
      phone: '+91 98765 67890',
      role: 'DOCTOR',
      roles: ['DOCTOR'],
      specialty: 'Cardiologist',
      specialization: 'Cardiologist',
      qualification: 'MBBS, MD, DM (Cardiology)',
      licenseNumber: 'UPMC-2010-45812',
      clinicName: 'Medanta OPD & Diagnostic Center',
      clinicAddress: 'Civil Lines, Prayagraj',
      verificationStatus: 'APPROVED',
      isPhoneVerified: true,
      hasCompletedProfile: true,
    };
    try {
      await AsyncStorage.setItem('gh_auth_token', 'demo-token-doctor');
      await AsyncStorage.setItem('gh_user_uid', 'doc-1');
      await AsyncStorage.setItem('gh_user_profile', JSON.stringify(profile));
    } catch {}
    useAppStore.getState().setRole('DOCTOR');
    useAppStore.getState().setRoles(['DOCTOR']);
    useAppStore.getState().setVerificationStatus('APPROVED');
    useAppStore.getState().setUserProfile(profile as any);
    useAppStore.getState().setIsAuthenticated(true);
    useAppStore.getState().setProfileExists(true);
    router.replace('/(doctor)/dashboard');
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
          <Icon name="doctor" size={36} color={colors.red} />
        </View>
        <HTitle size={20}>Doctor Console</HTitle>
        <Text style={styles.sub}>Medical Practitioner Consultation Desk</Text>
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
        title={loading ? "Verifying Doctor Credentials…" : "Sign In with Google"}
        onPress={handleGoogleSignIn}
        disabled={loading}
      />

      <Button
        title="⚡ 1-Click Demo Access (Dr. Ananya Sharma)"
        variant="secondary"
        style={{ marginTop: 12, borderColor: '#16A34A', borderWidth: 1 }}
        onPress={handleDemoDoctor}
      />

      <Button
        title="Register as Doctor"
        variant="secondary"
        style={{ marginTop: 12 }}
        onPress={() => router.push('/doctor-register')}
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


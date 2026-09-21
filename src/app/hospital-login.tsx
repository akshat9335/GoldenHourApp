import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Screen, Button, Icon, HTitle, Banner } from '@/components/ui';
import { authService } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';

export default function HospitalLogin() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setPendingStatus(null);
    try {
      const session = await authService.promptGoogleSignIn();

      if (!session.profileExists) {
        Alert.alert(
          'Profile Not Found',
          'No hospital administrator profile exists for this account. Please register your hospital.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Now', onPress: () => router.push('/hospital-register') },
          ]
        );
        return;
      }

      const rawRoles = (session.profile?.roles || [session.role || 'PATIENT']).map((r: string) => String(r).toUpperCase());
      const hasHospitalRole = rawRoles.includes('HOSPITAL');

      if (!hasHospitalRole) {
        Alert.alert(
          'Hospital Registration Required',
          'This Google account is not yet registered as a Hospital Facility. Would you like to register now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Hospital', onPress: () => router.push('/hospital-register') },
          ]
        );
        return;
      }

      // Check hospital-specific verification status
      const hospStatus = (
        session.profile?.roleVerificationStatus?.HOSPITAL ||
        session.profile?.verificationStatus ||
        session.verificationStatus ||
        'PENDING'
      ).toUpperCase();

      if (hospStatus === 'APPROVED' || hospStatus === 'VERIFIED') {
        useAppStore.getState().setRole('HOSPITAL');
        router.replace('/(hospital)/dashboard');
        return;
      }

      if (hospStatus === 'REJECTED') {
        Alert.alert(
          'Registration Inactive / Rejected',
          'Your hospital facility credentials have been rejected or revoked by the system administrator. Please contact support@goldenhour.app for assistance.'
        );
        return;
      }

      // hospStatus is PENDING
      setPendingStatus(
        'Your hospital registration and emergency facility credentials are under review by Golden Hour administrators. You will be activated upon approval.'
      );
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


import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const session = await authService.promptGoogleSignIn();

      if (!session.profileExists) {
        // Auto-register smoothly using Google details so user immediately lands on Home screen!
        try {
          await authService.register({
            name: session.name || 'Golden Hour User',
            email: session.email || 'user@goldenhour.org',
            role: 'PATIENT',
          });
        } catch {
          useAppStore.getState().setProfileExists(true);
        }
        useAppStore.getState().setRole('PATIENT');
        router.replace('/(patient)/home');
        return;
      }

      // Existing user: Route intelligently to their active professional role
      const userRoles = (session.profile?.roles || [session.role || 'PATIENT']).map((r: string) => String(r).toUpperCase());

      if (userRoles.includes('HOSPITAL')) {
        const hStatus = session.profile?.verificationStatus || session.profile?.roleVerificationStatus?.HOSPITAL || 'APPROVED';
        if (hStatus === 'APPROVED') {
          useAppStore.getState().setRole('HOSPITAL');
          router.replace('/(hospital)/dashboard');
          return;
        }
      }

      if (userRoles.includes('AMBULANCE_DRIVER') || userRoles.includes('AMBULANCE')) {
        const dStatus = session.profile?.verificationStatus || session.profile?.roleVerificationStatus?.AMBULANCE_DRIVER || 'APPROVED';
        if (dStatus === 'APPROVED') {
          useAppStore.getState().setRole('AMBULANCE_DRIVER');
          router.replace('/(ambulance)/dashboard');
          return;
        }
      }

      if (userRoles.includes('DOCTOR')) {
        const docStatus = session.profile?.verificationStatus || session.profile?.roleVerificationStatus?.DOCTOR || 'APPROVED';
        if (docStatus === 'APPROVED') {
          useAppStore.getState().setRole('DOCTOR');
          router.replace('/(doctor)/dashboard');
          return;
        }
      }

      if (userRoles.includes('FRONTLINE_WORKER') || userRoles.includes('ASHA')) {
        useAppStore.getState().setRole('FRONTLINE_WORKER');
        router.replace('/(worker)/dashboard');
        return;
      }

      // Default patient user
      useAppStore.getState().setRole('PATIENT');
      router.replace('/(patient)/home');
    } catch (err: any) {
      console.warn('[Login] Google sign-in failed:', err);
      const msg = err?.message || 'Google sign-in could not be completed. Please try again.';
      if (!msg.includes('cancelled') && !msg.includes('dismissed')) {
        Alert.alert('Sign In Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPatient = () => {
    useAppStore.getState().setRole('PATIENT');
    useAppStore.getState().setUserProfile({
      uid: 'patient-demo-1',
      name: 'Rahul Patel',
      email: 'rahul.patel@gmail.com',
      phone: '+91 98765 12345',
      role: 'PATIENT',
      roles: ['PATIENT'],
      verificationStatus: 'APPROVED',
      isPhoneVerified: true,
      hasCompletedProfile: true,
      crisisId: 'CRISIS-RP-911',
    } as any);
    useAppStore.getState().setIsAuthenticated(true);
    useAppStore.getState().setProfileExists(true);
    router.replace('/(patient)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { top: Math.max(insets.top, 16) + 6 }]}
          onPress={() => router.replace('/role-selection')}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Logo */}
        <Image
          source={require('../../assets/images/golden-hour-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Heading */}
        <Text style={styles.title}>Welcome to Golden Hour</Text>

        <Text style={styles.subtitle}>
          Your safety, connected in real time.
        </Text>

        {/* Login Card */}
        <View style={styles.card}>

          <Text style={styles.cardTitle}>User Login</Text>

          <Text style={styles.cardSubtitle}>
            Sign in to access emergency response services
          </Text>

          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>

            <Text style={styles.googleText}>
              {loading ? 'Signing in with Google…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Modern Reassuring Info Box for New Users */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>New to Golden Hour? Instant Access</Text>
              <Text style={styles.infoDescription}>
                No registration forms needed. Your emergency account is created automatically on your first Google sign-in.
              </Text>
            </View>
          </View>

          {/* Quick Demo Access for Testing */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoPatient}
            activeOpacity={0.7}
          >
            <Text style={styles.demoButtonText}>Quick Demo Access (Test Patient)</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to use Golden Hour for
          emergency response services.
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButton: {
    position: 'absolute',
    top: 18,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    zIndex: 10,
  },

  backArrow: {
    fontSize: 30,
    lineHeight: 30,
    color: '#1A1A1A',
    marginRight: 5,
  },

  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },

  logo: {
    width: 105,
    height: 105,
    marginBottom: 18,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 7,
  },

  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },

  googleButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleIcon: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  googleG: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },

  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    gap: 10,
  },

  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },

  infoDescription: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#166534',
    marginTop: 2,
  },

  demoButton: {
    marginTop: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  demoButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },

  terms: {
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 22,
    maxWidth: 310,
  },
});

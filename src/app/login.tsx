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

      if (session.profileExists) {
        // Normal user / patient sign-in: always activates PATIENT role
        useAppStore.getState().setRole('PATIENT');
        router.replace('/(patient)/home');
      } else {
        // First time user -> proceed to registration sequence
        router.push('/create-account');
      }
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

  const handleGuestLogin = () => {
    const store = useAppStore.getState();
    store.setIsAuthenticated(true);
    store.setProfileExists(true);
    store.setRole('PATIENT');
    store.setRoles(['PATIENT', 'user']);
    store.setUserProfile({
      uid: 'guest-patient-101',
      name: 'Guest Patient',
      email: 'guest@goldenhour.org',
      crisisId: 'GH-8821',
      trustScore: 95,
      role: 'PATIENT',
      roles: ['PATIENT', 'user'],
    });
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

          {/* Guest Demo Login Button */}
          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: '#208AEF', borderColor: '#208AEF', marginTop: 12 }]}
            activeOpacity={0.85}
            onPress={handleGuestLogin}
          >
            <Text style={[styles.googleText, { color: '#FFFFFF', fontWeight: '700' }]}>
              🚀 Quick Guest / Demo Login
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Text style={styles.infoText}>
            Testing & Evaluating?
          </Text>

          <Text style={styles.infoDescription}>
            Tap "Quick Guest / Demo Login" above to instantly test all features without Firebase setup.
          </Text>
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

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  orText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginHorizontal: 12,
  },

  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },

  infoDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 5,
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

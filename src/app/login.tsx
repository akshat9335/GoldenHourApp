import React from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
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
            onPress={() => {
              // Google Sign-In will be connected here later
            }}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>

            <Text style={styles.googleText}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Text style={styles.infoText}>
            New to Golden Hour?
          </Text>

          <Text style={styles.infoDescription}>
            Your account will be created automatically when you
            continue with Google.
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
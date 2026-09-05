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

export default function HospitalLoginScreen() {
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
        <Text style={styles.title}>Hospital Portal</Text>

        <Text style={styles.subtitle}>
          Connect your hospital to the Golden Hour network.
        </Text>

        {/* Login Card */}
        <View style={styles.card}>

          <View style={styles.hospitalBadge}>
            <Text style={styles.hospitalIcon}>🏥</Text>
          </View>

          <Text style={styles.cardTitle}>Hospital Login</Text>

          <Text style={styles.cardSubtitle}>
            Sign in to manage emergency requests and coordinate
            patient care.
          </Text>

          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={() => {
              // Hospital Google Sign-In will be connected later
            }}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>

            <Text style={styles.googleText}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Verification Notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeIcon}>✓</Text>

            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>
                Verified Hospital Access
              </Text>

              <Text style={styles.noticeText}>
                Only authorized hospital accounts can access
                the emergency network.
              </Text>
            </View>
          </View>

        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Golden Hour Emergency Network
        </Text>

        <Text style={styles.footerSubtext}>
          Faster coordination. Better emergency response.
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
    width: 95,
    height: 95,
    marginBottom: 14,
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
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 330,
    marginBottom: 28,
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
    alignItems: 'center',
  },

  hospitalBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  hospitalIcon: {
    fontSize: 29,
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
    marginBottom: 22,
  },

  googleButton: {
    width: '100%',
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

  notice: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 13,
    marginTop: 20,
    alignItems: 'flex-start',
  },

  noticeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 10,
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },

  noticeText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#64748B',
  },

  footer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 24,
  },

  footerSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});
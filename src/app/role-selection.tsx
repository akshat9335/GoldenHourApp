import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

export default function RoleSelectionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <Text style={styles.title}>Welcome to Golden Hour</Text>

        <Text style={styles.subtitle}>
          Choose how you want to continue
        </Text>

        <View style={styles.options}>

          {/* User */}
          <TouchableOpacity
            style={styles.roleCard}
            activeOpacity={0.85}
            onPress={() => router.replace('/login')}
          >
            <View style={[styles.iconCircle, styles.userIcon]}>
              <Text style={styles.icon}>👤</Text>
            </View>

            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>User</Text>
              <Text style={styles.roleDescription}>
                Report emergencies and get help quickly
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Hospital */}
          <TouchableOpacity
            style={styles.roleCard}
            activeOpacity={0.85}
            onPress={() => router.replace('/hospital-login')}
          >
            <View style={[styles.iconCircle, styles.hospitalIcon]}>
              <Text style={styles.icon}>🏥</Text>
            </View>

            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Hospital</Text>
              <Text style={styles.roleDescription}>
                Manage emergency requests and patients
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Driver */}
          <TouchableOpacity
            style={styles.roleCard}
            activeOpacity={0.85}
            onPress={() => router.replace('/driver-login')}
          >
            <View style={[styles.iconCircle, styles.driverIcon]}>
              <Text style={styles.icon}>🚑</Text>
            </View>

            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Driver</Text>
              <Text style={styles.roleDescription}>
                Manage ambulance assignments and routes
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.footer}>
          Emergency response, connected in real time.
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
    justifyContent: 'center',
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 38,
  },

  options: {
    gap: 16,
  },

  roleCard: {
    minHeight: 94,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  userIcon: {
    backgroundColor: '#FDECEC',
  },

  hospitalIcon: {
    backgroundColor: '#EAF2FF',
  },

  driverIcon: {
    backgroundColor: '#EAF7EE',
  },

  icon: {
    fontSize: 29,
  },

  roleText: {
    flex: 1,
  },

  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },

  roleDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
  },

  arrow: {
    fontSize: 30,
    color: '#94A3B8',
    marginLeft: 8,
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 38,
  },
});
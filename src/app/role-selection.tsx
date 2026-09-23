import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { router, Link } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import { Card, Icon, IconName, HTitle } from '@/components/ui';
import { useAppStore, Role } from '@/store/useAppStore';

const ROLES: Array<{ role: Role; label: string; sub: string; icon: IconName; href: string }> = [
  { role: 'user', label: 'Patient / Public', sub: 'Request emergency help', icon: 'profile', href: '/login' },
  { role: 'hospital', label: 'Hospital Staff', sub: 'Coordinate incoming patients', icon: 'hospital', href: '/hospital-login' },
  { role: 'ambulance', label: 'Ambulance Crew', sub: 'Respond to dispatches', icon: 'ambulance', href: '/driver-login' },
  { role: 'doctor', label: 'Doctor', sub: 'Manage consultations & queue', icon: 'doctor', href: '/doctor-login' },
  { role: 'ADMIN', label: 'Administrator Console', sub: 'Verify credentials, doctors & fleet', icon: 'idCard', href: '/admin-dashboard' },
];

export default function RoleSelection() {
  const setRole = useAppStore((s) => s.setRole);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <HTitle size={21}>Continue as</HTitle>
      <Text style={styles.sub}>Select how you'll be using Golden Hour</Text>
      <View style={{ marginTop: 24 }}>
        {ROLES.map((r) => (
          <Link key={r.role} href={r.href as any} asChild onPress={() => setRole(r.role)}>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.rowTouchable}>
                <View style={[styles.iconWrap, r.role === 'ADMIN' && { backgroundColor: '#FEF2F2' }]}>
                  <Icon name={r.icon} size={22} color={r.role === 'ADMIN' ? '#DC2626' : colors.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleLabel}>{r.label}</Text>
                  <Text style={styles.roleSub}>{r.sub}</Text>
                </View>
                <Icon name="chevR" color={colors.inkFaint} />
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 70 },
  sub: { color: colors.inkSoft, fontSize: 12.5, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    marginBottom: 12,
    ...shadow.card,
  },
  rowTouchable: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { fontWeight: '700', fontSize: 14, color: colors.ink },
  roleSub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
});

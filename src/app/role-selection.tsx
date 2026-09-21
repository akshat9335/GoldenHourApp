import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <HTitle size={21}>Continue as</HTitle>
      <Text style={styles.sub}>Select how you'll be using Golden Hour</Text>
      <View style={{ gap: 12, marginTop: 24 }}>
        {ROLES.map((r) => (
          <Card key={r.role} style={styles.card}>
            <TouchableOpacity
              style={styles.rowTouchable}
              onPress={() => {
                setRole(r.role);
                router.push(r.href as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, r.role === 'ADMIN' && { backgroundColor: '#FEF2F2' }]}>
                <Icon name={r.icon} size={22} color={r.role === 'ADMIN' ? '#DC2626' : colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleLabel}>{r.label}</Text>
                <Text style={styles.roleSub}>{r.sub}</Text>
              </View>
              <Icon name="chevR" color={colors.inkFaint} />
            </TouchableOpacity>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 70 },
  sub: { color: colors.inkSoft, fontSize: 12.5, marginTop: 6 },
  card: { padding: 4 },
  rowTouchable: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { fontWeight: '700', fontSize: 14, color: colors.ink },
  roleSub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
});

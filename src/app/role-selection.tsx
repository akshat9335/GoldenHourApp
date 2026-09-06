import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, Icon, IconName, HTitle } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

const ROLES: Array<{ role: 'user' | 'hospital' | 'ambulance' | 'doctor'; label: string; sub: string; icon: IconName; href: string }> = [
  { role: 'user', label: 'Patient / Public', sub: 'Request emergency help', icon: 'profile', href: '/login' },
  { role: 'hospital', label: 'Hospital Staff', sub: 'Coordinate incoming patients', icon: 'hospital', href: '/hospital-login' },
  { role: 'ambulance', label: 'Ambulance Crew', sub: 'Respond to dispatches', icon: 'ambulance', href: '/driver-login' },
  { role: 'doctor', label: 'Doctor', sub: 'Manage consultations & queue', icon: 'doctor', href: '/doctor-login' },
];

export default function RoleSelection() {
  const setRole = useAppStore((s) => s.setRole);
  return (
    <View style={styles.container}>
      <HTitle size={21}>Continue as</HTitle>
      <Text style={styles.sub}>Select how you'll be using Golden Hour</Text>
      <View style={{ gap: 12, marginTop: 24 }}>
        {ROLES.map((r) => (
          <Card key={r.role} style={styles.card}>
            <View
              style={styles.rowTouchable}
              onTouchEnd={() => {
                setRole(r.role);
                router.push(r.href as any);
              }}
            >
              <View style={styles.iconWrap}>
                <Icon name={r.icon} size={22} color={colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleLabel}>{r.label}</Text>
                <Text style={styles.roleSub}>{r.sub}</Text>
              </View>
              <Icon name="chevR" color={colors.inkFaint} />
            </View>
          </Card>
        ))}
      </View>
    </View>
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

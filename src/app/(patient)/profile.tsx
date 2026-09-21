import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Divider, Icon, PatientNav, HTitle, IdentitySafetyCard } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function Profile() {
  const goldenHourId = useAppStore((s) => s.goldenHourId);
  const trustScore = useAppStore((s) => s.trustScore);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  useEffect(() => {
    api.users.getProfile().then((profile) => {
      if (profile) {
        setUserProfile(profile);
      }
    }).catch(() => {});
  }, []);

  const displayName = userProfile?.name || 'Akshat Srivastava';
  const phone = userProfile?.phone || userProfile?.phoneNumber || '+91 98765 43210';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AS';

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View>
            <HTitle size={16}>{displayName}</HTitle>
            <Text style={styles.phone}>{phone}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Card style={styles.stat}><Text style={styles.statNum}>2</Text><Text style={styles.statLabel}>SOS EVENTS</Text></Card>
          <Card style={styles.stat}><Text style={[styles.statNum, { color: colors.success }]}>100%</Text><Text style={styles.statLabel}>PROFILE</Text></Card>
        </View>
        <View style={{ marginBottom: 12 }}>
          <IdentitySafetyCard goldenHourId={goldenHourId} trustScore={trustScore} />
        </View>
        <Card style={{ padding: 4, marginBottom: 12 }}>
          <Row label="Medical Information" icon="hospital" onPress={() => router.push('/medical-profile')} />
          <Divider />
          <Row label="Emergency Contacts" icon="phone" onPress={() => router.push('/contacts-setup')} />
          <Divider />
          <Row label="Emergency History" icon="history" onPress={() => router.push('/(patient)/history')} />
        </Card>
        <Card style={{ padding: 4 }}>
          <Row label="Switch Portal / Role" icon="idCard" onPress={() => router.push('/role-selection')} />
          <Divider />
          <Row label="Settings" icon="gps" onPress={() => router.push('/settings')} />
          <Divider />
          <Row label="Privacy & Security" icon="pin" onPress={() => router.push('/privacy')} />
        </Card>
      </Screen>
      <PatientNav active="/(patient)/profile" />
    </View>
  );
}

function Row({ label, icon, onPress }: any) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Icon name={icon} color={colors.ink} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Icon name="chevR" color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.red, fontWeight: '800', fontSize: 20 },
  phone: { fontSize: 11.5, color: colors.inkFaint },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 16, color: colors.ink },
  statLabel: { fontSize: 9.5, color: colors.inkFaint, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
});

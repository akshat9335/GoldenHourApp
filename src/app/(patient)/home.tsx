import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, SosHold, PatientNav, Divider } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { initDeviceLocation } from '@/services/deviceLocation';

export default function PatientHome() {
  const voiceSosEnabled = useAppStore((s) => s.voiceSosEnabled);
  const voiceSosPhrase = useAppStore((s) => s.voiceSosPhrase);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  useEffect(() => {
    // Pre-warm device GPS instantly on home mount
    initDeviceLocation();

    api.users.getProfile().then((profile) => {
      if (profile) {
        setUserProfile(profile);
      }
    }).catch(() => {});
  }, []);

  const displayName = userProfile?.name || 'Golden Hour User';
  const firstName = displayName.split(' ')[0] || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GH';

  const resetEmergencySession = useAppStore((s) => s.resetEmergencySession);

  const startEmergency = () => {
    resetEmergencySession();
    router.push('/(patient)/emergency/select-type');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen padBottom={95}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>EMERGENCY DASHBOARD</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              style={styles.switchRoleBtn}
              onPress={() => router.push('/role-selection')}
            >
              <Text style={styles.switchRoleText}>Role</Text>
            </Pressable>
            <Pressable
              style={styles.avatarBtn}
              onPress={() => router.push('/(patient)/profile')}
            >
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <Card style={styles.locationCard}>
          <Icon name="gps" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locTitle}>Live location active</Text>
            <Text style={styles.locSub}>
              {locationAddress ||
                (lastKnownLocation
                  ? `${lastKnownLocation.latitude.toFixed(3)}°N, ${lastKnownLocation.longitude.toFixed(3)}°E`
                  : 'Acquiring device GPS...')} · GPS active
            </Text>
          </View>
          <Pill color="success">READY</Pill>
        </Card>

        <View style={styles.sosZone}>
          <SosHold
            label="SOS"
            sublabel="EMERGENCY"
            onPress={startEmergency}
            onConfirm={startEmergency}
          />
          <Text style={styles.sosHint}>
            {voiceSosEnabled
              ? `Say "${voiceSosPhrase}" or press SOS to report emergency`
              : 'Press SOS to report emergency with photo, voice & AI assistance'}
          </Text>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="ai" color={colors.blue} label="AI First Aid" onPress={() => router.push('/(patient)/ai-home')} />
          <QuickAction icon="ambulance" color={colors.red} label="Report Accident" onPress={startEmergency} />
          <QuickAction icon="hospital" color={colors.ink} label="Hospitals" onPress={() => router.push('/nearby-hospitals')} />
        </View>

        <Text style={styles.eyebrow}>QUICK ACCESS</Text>
        <Card style={{ padding: 4 }}>
          <Pressable style={styles.row} onPress={() => router.push('/(patient)/medicines')}>
            <Text style={{ fontSize: 18 }}>💊</Text>
            <Text style={styles.rowLabel}>Find Medicines Nearby (24/7 ER Stock)</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/(patient)/diagnostics/book')}>
            <Text style={{ fontSize: 18 }}>🧪</Text>
            <Text style={styles.rowLabel}>Book Diagnostic Lab Tests (ECG, CT, Blood)</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/(patient)/consult-doctor')}>
            <Icon name="doctor" color={colors.ink} />
            <Text style={styles.rowLabel}>Consult Doctor</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/contacts-setup')}>
            <Icon name="phone" color={colors.ink} />
            <Text style={styles.rowLabel}>Emergency Contacts</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/(patient)/history')}>
            <Icon name="history" color={colors.ink} />
            <Text style={styles.rowLabel}>Emergency History</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
        </Card>
      </Screen>
      <PatientNav active="/(patient)/home" />
    </View>
  );
}

function QuickAction({ icon, color, label, onPress }: any) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <Icon name={icon} color={color} />
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontSize: 11.5, color: colors.inkFaint },
  name: { fontWeight: '700', fontSize: 18, color: colors.ink },
  switchRoleBtn: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  switchRoleText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.red, fontWeight: '800', fontSize: 12.5 },
  dot: { position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red },
  locationCard: { padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  locTitle: { fontSize: 12, fontWeight: '700', color: colors.ink },
  locSub: { fontSize: 10.5, color: colors.inkFaint },
  sosZone: { alignItems: 'center', marginVertical: 20 },
  sosHint: { fontSize: 11, color: colors.inkFaint, marginTop: 14 },
  quickRow: { flexDirection: 'row', gap: 10, marginVertical: 18 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F5', padding: 14, alignItems: 'center', gap: 8 },
  quickLabel: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', color: colors.ink },
  eyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
});

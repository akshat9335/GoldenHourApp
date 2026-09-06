import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, SosHold, PatientNav, Divider } from '@/components/ui';

export default function PatientHome() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening,</Text>
            <Text style={styles.name}>Akshat</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={styles.avatarBtn} onPress={() => router.push('/(patient)/profile')}>
              <Text style={styles.avatarText}>AS</Text>
            </Pressable>
            <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')}>
              <Icon name="bell" />
              <View style={styles.dot} />
            </Pressable>
          </View>
        </View>

        <Card style={styles.locationCard}>
          <Icon name="gps" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locTitle}>Live location active</Text>
            <Text style={styles.locSub}>Koramangala, Bengaluru · GPS strong</Text>
          </View>
          <Pill color="success">READY</Pill>
        </Card>

        <View style={styles.sosZone}>
          <SosHold onConfirm={() => router.push('/(patient)/emergency/select-type')} />
          <Text style={styles.sosHint}>Press and hold to alert help immediately</Text>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="ai" color={colors.blue} label="AI First Aid" onPress={() => router.push('/(patient)/ai-home')} />
          <QuickAction icon="ambulance" color={colors.red} label="Report Accident" onPress={() => router.push('/(patient)/emergency/select-type')} />
          <QuickAction icon="hospital" color={colors.ink} label="Hospitals" onPress={() => router.push('/nearby-hospitals')} />
        </View>

        <Text style={styles.eyebrow}>QUICK ACCESS</Text>
        <Card style={{ padding: 4 }}>
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

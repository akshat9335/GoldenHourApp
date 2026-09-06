import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { Icon, IconName } from './Icon';

type NavItem = { href: string; label: string; icon: IconName };

function BaseNav({ items, active, onSos }: { items: NavItem[]; active: string; onSos?: () => void }) {
  const router = useRouter();
  const mid = Math.floor(items.length / 2);
  return (
    <View style={styles.bar}>
      {items.map((it, i) => (
        <React.Fragment key={it.href}>
          {onSos && i === mid ? (
            <Pressable style={styles.sos} onPress={onSos}>
              <Icon name="ambulance" size={20} color="#fff" />
            </Pressable>
          ) : null}
          <Pressable style={styles.item} onPress={() => router.push(it.href as any)}>
            <Icon name={it.icon} size={19} color={active === it.href ? colors.red : colors.inkFaint} />
            <Text style={[styles.lbl, { color: active === it.href ? colors.red : colors.inkFaint }]}>{it.label}</Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

export function PatientNav({ active }: { active: string }) {
  const router = useRouter();
  return (
    <BaseNav
      active={active}
      onSos={() => router.push('/(patient)/emergency/select-type')}
      items={[
        { href: '/(patient)/home', label: 'Home', icon: 'home' },
        { href: '/(patient)/ai-home', label: 'AI Assist', icon: 'ai' },
        { href: '/(patient)/live-map', label: 'Map', icon: 'map' },
        { href: '/(patient)/history', label: 'History', icon: 'history' },
      ]}
    />
  );
}

export function HospitalNav({ active }: { active: string }) {
  return (
    <BaseNav
      active={active}
      items={[
        { href: '/(hospital)/dashboard', label: 'Dashboard', icon: 'home' },
        { href: '/(hospital)/requests', label: 'Requests', icon: 'bell' },
        { href: '/(hospital)/capacity', label: 'Capacity', icon: 'bed' },
        { href: '/(hospital)/staff', label: 'Staff', icon: 'profile' },
      ]}
    />
  );
}

export function DoctorNav({ active }: { active: string }) {
  return (
    <BaseNav
      active={active}
      items={[
        { href: '/(doctor)/dashboard', label: 'Dashboard', icon: 'home' },
        { href: '/(doctor)/queue', label: 'Queue', icon: 'clock' },
        { href: '/(doctor)/appointments', label: 'Appointments', icon: 'calendar' },
        { href: '/(doctor)/profile', label: 'Profile', icon: 'profile' },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 16, left: 16, right: 16, height: 66,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 26,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4,
    shadowColor: '#141E32', shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  item: { alignItems: 'center', gap: 3 },
  lbl: { fontSize: 8.7, fontWeight: '700' },
  sos: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center',
    marginTop: -28, shadowColor: colors.red, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, Icon, MapBg, PatientNav } from '@/components/ui';
import { AMB_STEPS } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';

export default function LiveMap() {
  const ambStatus = useAppStore((s) => s.ambStatus);
  return (
    <View style={{ flex: 1 }}>
      <MapBg />
      <View style={styles.topBar}>
        <Card style={{ flex: 1, padding: 12, paddingHorizontal: 14 }}>
          <Text style={styles.statusText}>{AMB_STEPS[ambStatus]} · ETA 4 min</Text>
        </Card>
      </View>
      <View style={[styles.pin, { top: '44%', left: '38%' }]}><Icon name="pin" color={colors.red} /></View>
      <View style={[styles.pin, { top: '58%', left: '60%' }]}><Icon name="ambulance" /></View>
      <View style={[styles.pin, { top: '30%', left: '62%' }]}><Icon name="hospital" /></View>
      <Pressable style={styles.bottomCard} onPress={() => router.push('/(patient)/emergency/active')}>
        <Card style={styles.bottomCardInner}>
          <Icon name="ambulance" />
          <View style={{ flex: 1 }}>
            <Text style={styles.unitText}>Unit KA-05-AB approaching</Text>
            <Text style={styles.unitSub}>1.2 km away</Text>
          </View>
          <Icon name="chevR" color={colors.blue} />
        </Card>
      </Pressable>
      <PatientNav active="/(patient)/live-map" />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 5, flexDirection: 'row' },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  pin: { position: 'absolute' },
  bottomCard: { position: 'absolute', bottom: 96, left: 16, right: 16, zIndex: 5 },
  bottomCardInner: { padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  unitText: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  unitSub: { fontSize: 10.5, color: colors.inkFaint },
});

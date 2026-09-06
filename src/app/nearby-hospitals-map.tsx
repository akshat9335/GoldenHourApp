import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, HTitle, Icon, MapBg } from '@/components/ui';

const PINS = [
  { top: '42%', left: '38%' },
  { top: '30%', left: '58%' },
  { top: '60%', left: '70%' },
];

export default function NearbyHospitalsMap() {
  return (
    <View style={{ flex: 1 }}>
      <MapBg />
      <View style={styles.topBar}>
        <Card style={styles.topCard}>
          <Pressable style={styles.backbtn} onPress={() => router.back()}>
            <Icon name="chevL" size={14} />
          </Pressable>
          <HTitle size={14}>Nearby Hospitals</HTitle>
        </Card>
      </View>
      {PINS.map((p, i) => (
        <View key={i} style={[styles.pin, { top: p.top, left: p.left }]}>
          <Icon name="hospital" color={colors.blue} />
        </View>
      ))}
      <View style={[styles.pin, { top: '50%', left: '50%', marginLeft: -9, marginTop: -9 }]}>
        <Icon name="pin" color={colors.red} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 5 },
  topCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 12 },
  backbtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  pin: { position: 'absolute' },
});

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, HTitle, Icon, InteractiveMap } from '@/components/ui';

export default function NearbyHospitalsMap() {
  return (
    <View style={{ flex: 1 }}>
      <InteractiveMap
        destLat={12.9352}
        destLng={77.6146}
        destTitle="Nearest Emergency Hospital"
        userLat={12.9279}
        userLng={77.6271}
      />
      <View style={styles.topBar}>
        <Card style={styles.topCard}>
          <Pressable style={styles.backbtn} onPress={() => router.back()}>
            <Icon name="chevL" size={14} />
          </Pressable>
          <HTitle size={14}>Nearby Hospitals</HTitle>
        </Card>
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

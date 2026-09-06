import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Card, Icon, MapBg, Button } from '@/components/ui';

export default function NavigatePatient() {
  return (
    <View style={{ flex: 1 }}>
      <MapBg />
      <View style={styles.topBar}>
        <Card style={{ flex: 1, padding: 12, paddingHorizontal: 14 }}>
          <Text style={styles.statusText}>Navigating to patient · ETA 6 min</Text>
        </Card>
      </View>
      <View style={styles.pin}><Icon name="pin" color={colors.red} /></View>
      <View style={styles.bottomBar}>
        <Button title="Mark Arrived" onPress={() => router.push('/(ambulance)/arrived-patient')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 5, flexDirection: 'row' },
  statusText: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  pin: { position: 'absolute', top: '50%', left: '52%' },
  bottomBar: { position: 'absolute', bottom: 40, left: 16, right: 16, zIndex: 5 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Banner, Icon } from '@/components/ui';

export default function PickedUp() {
  return (
    <Screen>
      <TopBar title="Navigate to Hospital" back={false} />
      <Card style={styles.card}>
        <Icon name="hospital" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>St. Martha's Hospital</Text>
          <Text style={styles.sub}>3.4 km · ETA 11 min</Text>
        </View>
      </Card>
      <Banner color="success" icon={<Icon name="check" size={14} color={colors.success} />}>
        Hospital notified — Trauma Bay 2 is being prepared.
      </Banner>
      <View style={{ height: 16 }} />
      <Button title="Arrived at Hospital" onPress={() => router.push('/(ambulance)/hospital-arrival')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  name: { fontWeight: '700', fontSize: 13, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint },
});

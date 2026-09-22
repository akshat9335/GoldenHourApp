import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Icon, Pill } from '@/components/ui';
import { EMERGENCY_TYPES } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';
import { initDeviceLocation } from '@/services/deviceLocation';

export default function SelectType() {
  const setSelectedType = useAppStore((s) => s.setSelectedType);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const locationAddress = useAppStore((s) => s.locationAddress);

  useEffect(() => {
    // Warm up GPS fix proactively while user selects emergency type
    initDeviceLocation();
  }, []);

  return (
    <Screen>
      <TopBar title="What kind of emergency?" />

      {/* Realtime Incident GPS Header */}
      <View style={styles.locBanner}>
        <Icon name="pin" size={15} color={colors.red} />
        <View style={{ flex: 1, marginHorizontal: 6 }}>
          <Text style={styles.locBannerText} numberOfLines={1}>
            {locationAddress
              ? `${locationAddress}${lastKnownLocation ? ` (${lastKnownLocation.latitude.toFixed(4)}°N, ${lastKnownLocation.longitude.toFixed(4)}°E)` : ''}`
              : (lastKnownLocation
                  ? `${lastKnownLocation.latitude.toFixed(4)}°N, ${lastKnownLocation.longitude.toFixed(4)}°E`
                  : 'Acquiring incident GPS lock...')}
          </Text>
        </View>
        <Pill color={lastKnownLocation ? 'success' : 'amber'}>
          {lastKnownLocation ? '📍 GPS LOCKED' : '🛰️ LOCKING'}
        </Pill>
      </View>

      <View style={styles.grid}>
        {EMERGENCY_TYPES.map((t) => (
          <Pressable
            key={t.label}
            style={styles.cell}
            onPress={() => {
              setSelectedType(t.label);
              router.push('/(patient)/emergency/patient-info');
            }}
          >
            <Card style={styles.card}>
              <Icon name={t.icon as any} color={t.color} size={22} />
              <Text style={styles.label}>{t.label}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  locBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  locBannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.ink,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%' },
  card: { padding: 16, paddingVertical: 18, alignItems: 'center', gap: 10 },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.ink },
});

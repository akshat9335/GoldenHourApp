import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, Linking, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Icon, PatientNav } from '@/components/ui';
import { api } from '@/services/api';

import { useAppStore } from '@/store/useAppStore';

const FILTERS = ['All', 'Open Now', 'Trauma Center', 'ICU Available'];

interface HospitalItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  dist: string;
  eta: string;
  tag: string;
  tagColor: 'success' | 'amber' | 'grey';
  rawBeds: number;
  totalBeds?: number;
  bedsDisplay: string;
  rawIcu: number;
  icuDisplay: string;
  trauma: string | null;
  hasTrauma: boolean;
  latitude?: number;
  longitude?: number;
}

export default function NearbyHospitals() {
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      const lat = lastKnownLocation?.latitude;
      const lng = lastKnownLocation?.longitude;

      if (!lat || !lng) {
        setLoading(false);
        return;
      }

      const res: any = await api.location.getNearbyHospitals(lat, lng, 35);
      const data = res?.data || res;

      if (Array.isArray(data) && data.length > 0) {
        const mapped: HospitalItem[] = data.map((h: any) => {
          const availBeds = h.availableBeds !== undefined
            ? Number(h.availableBeds)
            : (h.availableCapacity !== undefined ? Number(h.availableCapacity) : 4);
          const totalBeds = h.totalBeds !== undefined ? Number(h.totalBeds) : undefined;
          const availIcu = h.availableIcuBeds !== undefined
            ? Number(h.availableIcuBeds)
            : (h.icuBeds !== undefined ? Number(h.icuBeds) : 2);

          const isTrauma = !!(h.traumaLevel || (h.emergencyCapability && h.emergencyCapability.some((f: string) => f.toLowerCase().includes('trauma'))));

          return {
            id: h.hospitalId || h.id || h.name,
            name: h.name || 'Hospital Center',
            address: h.address || '',
            phone: h.phone || '108',
            dist: h.distanceKm ? `${h.distanceKm.toFixed(1)} km` : '2.1 km',
            eta: h.etaMinutes ? `${h.etaMinutes} min` : '8 min',
            tag: availBeds > 0 ? 'OPEN' : 'BUSY',
            tagColor: availBeds > 0 ? 'success' : 'amber',
            rawBeds: availBeds,
            totalBeds,
            bedsDisplay: totalBeds ? `${availBeds} free / ${totalBeds}` : `${availBeds} beds free`,
            rawIcu: availIcu,
            icuDisplay: `ICU: ${availIcu} free`,
            trauma: h.traumaLevel ? `Trauma L${h.traumaLevel}` : (isTrauma ? 'Trauma Care' : null),
            hasTrauma: isTrauma,
            latitude: h.latitude ?? h.lat ?? (h.location?.latitude ?? lat + 0.015),
            longitude: h.longitude ?? h.lng ?? (h.location?.longitude ?? lng + 0.015),
          };
        });
        setHospitals(mapped);
      }
    } catch (_err) {
      // Offline fallback preserves state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastKnownLocation]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHospitals();
  };

  const filteredHospitals = hospitals.filter((h) => {
    if (selectedFilter === 'Open Now') return h.rawBeds > 0;
    if (selectedFilter === 'Trauma Center') return h.hasTrauma;
    if (selectedFilter === 'ICU Available') return h.rawIcu > 0;
    return true;
  });

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '') || '108';
    Linking.openURL(`tel:${cleanPhone}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.red]}
            tintColor={colors.red}
          />
        }
      >
        <View style={styles.headerRow}>
          <TopBar title="Nearby Hospitals" back={true} onPressBack={() => router.back()} />
          <Pressable
            style={styles.mapBtn}
            onPress={() => {
              const target = filteredHospitals[0] || hospitals[0];
              router.push({
                pathname: '/nearby-hospitals-map',
                params: {
                  lat: String(target?.latitude ?? (lastKnownLocation?.latitude ?? 12.9667)),
                  lng: String(target?.longitude ?? (lastKnownLocation?.longitude ?? 77.5872)),
                  name: target?.name || 'Emergency Hospitals',
                  address: target?.address || '',
                  phone: target?.phone || '108',
                  eta: target?.eta || '',
                  beds: `${target?.bedsDisplay ?? ''} · ${target?.icuDisplay ?? ''}`,
                },
              });
            }}
          >
            <Icon name="map" size={16} color={colors.blue} />
          </Pressable>
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const isSelected = selectedFilter === f;
            return (
              <Pressable key={f} onPress={() => setSelectedFilter(f)}>
                <Pill color={isSelected ? 'red' : 'grey'}>{f}</Pill>
              </Pressable>
            );
          })}
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text style={styles.loadingText}>Fetching live capacity from Golden Hour Network...</Text>
          </View>
        )}

        {filteredHospitals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hospitals match the "{selectedFilter}" filter.</Text>
            <Button
              title="Show All Hospitals"
              variant="secondary"
              onPress={() => setSelectedFilter('All')}
              style={{ marginTop: 10 }}
            />
          </Card>
        ) : (
          filteredHospitals.map((h) => (
            <Card key={h.id} style={styles.card}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.name}>{h.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {h.address ? `${h.dist} · ${h.address}` : `${h.dist} · ETA ${h.eta}`}
                  </Text>
                </View>
                <Pill color={h.tagColor}>{h.tag}</Pill>
              </View>

              <View style={styles.tagsRow}>
                <Pill color={h.rawBeds > 0 ? 'grey' : 'amber'}>{h.bedsDisplay}</Pill>
                <Pill color={h.rawIcu > 0 ? 'blue' : 'grey'}>{h.icuDisplay}</Pill>
                {h.trauma && <Pill color="amber">{h.trauma}</Pill>}
              </View>

              <View style={styles.actions}>
                <View style={styles.actionCol}>
                  <Button
                    title="Navigate"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/nearby-hospitals-map',
                        params: {
                          lat: String(h.latitude ?? 12.9716),
                          lng: String(h.longitude ?? 77.5946),
                          name: h.name,
                          address: h.address || '',
                          phone: h.phone || '',
                          eta: h.eta || '',
                          beds: `${h.bedsDisplay} · ${h.icuDisplay}`,
                        },
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </View>
                <View style={styles.actionCol}>
                  <Button
                    title="Call Desk"
                    onPress={() => handleCall(h.phone)}
                    style={{ width: '100%' }}
                  />
                </View>
              </View>
            </Card>
          ))
        )}
      </Screen>
      <PatientNav active="/nearby-hospitals" />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mapBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center' },
  loadingText: { fontSize: 12, color: colors.inkFaint },
  card: { padding: 14, marginBottom: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionCol: { flex: 1 },
  emptyCard: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.inkFaint },
});

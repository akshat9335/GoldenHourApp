import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Icon } from '@/components/ui';
import { PatientNav } from '@/components/ui';

const FILTERS = ['All', 'Open Now', 'Trauma Center', 'ICU Available'];
const HOSPITALS = [
  { name: "St. Martha's Hospital", dist: '3.4 km', eta: '11 min', tag: 'OPEN', tagColor: 'success' as const, beds: 4, icu: '4 beds', trauma: 'Trauma L1' },
  { name: 'Fortis Emergency Care', dist: '2.1 km', eta: '7 min', tag: 'BUSY', tagColor: 'amber' as const, beds: 1, icu: '0 beds', trauma: null },
  { name: 'Apollo Speciality', dist: '5.8 km', eta: '16 min', tag: 'OPEN', tagColor: 'success' as const, beds: 9, icu: '6 beds', trauma: 'Trauma L2' },
];

export default function NearbyHospitals() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.headerRow}>
          <TopBar title="Nearby Hospitals" back={false} />
          <Pressable style={styles.mapBtn} onPress={() => router.push('/nearby-hospitals-map')}>
            <Icon name="map" size={16} color={colors.blue} />
          </Pressable>
        </View>
        <View style={styles.filters}>
          {FILTERS.map((f, i) => (
            <Pill key={f} color={i === 0 ? 'red' : 'grey'}>{f}</Pill>
          ))}
        </View>
        {HOSPITALS.map((h) => (
          <Pressable key={h.name} onPress={() => router.push('/hospital-detail')}>
            <Card style={styles.card}>
              <View style={styles.rowTop}>
                <View>
                  <Text style={styles.name}>{h.name}</Text>
                  <Text style={styles.sub}>{h.dist} · ETA {h.eta}</Text>
                </View>
                <Pill color={h.tagColor}>{h.tag}</Pill>
              </View>
              <View style={styles.tagsRow}>
                <Pill color="grey">{h.beds} beds</Pill>
                {h.icu && <Pill color="blue">ICU: {h.icu}</Pill>}
                {h.trauma && <Pill color="amber">{h.trauma}</Pill>}
              </View>
              <View style={styles.actions}>
                <Button title="Navigate" variant="secondary" onPress={() => router.push('/(patient)/live-map')} />
                <Button title="Call" />
              </View>
            </Card>
          </Pressable>
        ))}
      </Screen>
      <PatientNav active="/nearby-hospitals" />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mapBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  card: { padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});

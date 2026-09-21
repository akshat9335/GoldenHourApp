import React from 'react';
import { View, Text, Pressable, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Card, HTitle, Icon, InteractiveMap, openExternalMapPreview } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function NearbyHospitalsMap() {
  const insets = useSafeAreaInsets();
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    name?: string;
    address?: string;
    phone?: string;
    eta?: string;
    beds?: string;
  }>();

  const hospLat = params.lat ? parseFloat(params.lat) : (lastKnownLocation?.latitude ?? 12.9352);
  const hospLng = params.lng ? parseFloat(params.lng) : (lastKnownLocation?.longitude ?? 77.6146);
  const hospTitle = params.name || "Emergency Hospital Center";
  const hospSub = params.address || params.beds || "Emergency Trauma ER Standing By";
  const hospPhone = params.phone || '108';
  const hospEta = params.eta || '~8 min';

  const userLat = lastKnownLocation?.latitude ?? hospLat;
  const userLng = lastKnownLocation?.longitude ?? hospLng;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <InteractiveMap
        destLat={hospLat}
        destLng={hospLng}
        destTitle={hospTitle}
        userLat={userLat}
        userLng={userLng}
        showNavButton={false}
      />

      <View style={[styles.topBar, { top: Math.max(insets.top, 24) + 8 }]}>
        <Card style={styles.topCard}>
          <Pressable style={styles.backbtn} onPress={() => router.back()}>
            <Icon name="chevL" size={14} />
          </Pressable>
          <HTitle size={14}>Hospital Map Route</HTitle>
        </Card>
      </View>

      {/* Hospital Direction Card */}
      <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Card style={styles.hospSheet}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.hospName} numberOfLines={1}>{hospTitle}</Text>
              <Text style={styles.hospSub} numberOfLines={1}>{hospSub}</Text>
            </View>
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>{hospEta}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() =>
                openExternalMapPreview({
                  lat: hospLat,
                  lng: hospLng,
                  title: hospTitle,
                  originLat: userLat,
                  originLng: userLng,
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.navBtnText}>🗺️ View in Google Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${hospPhone}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.callBtnText}>📞 Call Desk</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 5 },
  topCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 12 },
  backbtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  hospSheet: { padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  hospName: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  hospSub: { fontSize: 11, color: colors.inkSoft },
  etaBadge: { backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#10B98140' },
  etaText: { fontSize: 12, fontWeight: '800', color: '#10B981' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  navBtn: { flex: 1, backgroundColor: '#0284C7', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  callBtn: { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  callBtnText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});

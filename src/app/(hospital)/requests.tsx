import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, HospitalNav, Icon, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface HospitalRequestItem {
  id: string;
  patientName: string;
  severity: string;
  eta: string;
  color: 'red' | 'amber';
  status: string;
  incidentType?: string;
  locationAddress?: string;
  location?: { latitude: number; longitude: number };
  createdAt?: string;
}

export default function HospitalRequests() {
  const [requests, setRequests] = useState<HospitalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setActiveHospitalRequestId = useAppStore((s) => s.setActiveHospitalRequestId);

  const fetchRequests = useCallback(async () => {
    try {
      const res: any = await api.hospitals.getRequests();
      const raw = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(raw)) {
        const pending = raw.filter((d: any) => {
          const s = String(d.status || 'NEW').toUpperCase();
          return s === 'NEW' || s === 'PENDING' || s === 'QUEUED_STANDBY';
        });

        // Sort newest first
        pending.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        const mapped: HospitalRequestItem[] = pending.map((d: any) => {
          const sev = String(d.severity || 'HIGH').toUpperCase();
          return {
            id: d.requestId || d.id || d.emergencyId,
            patientName: d.patientName || d.userName || 'Emergency Patient',
            severity: sev,
            eta: d.eta || '8 min',
            color: (sev === 'CRITICAL' || sev === 'HIGH' ? 'red' : 'amber') as 'red' | 'amber',
            status: d.status || 'NEW',
            incidentType: d.incidentType || 'Emergency',
            locationAddress: d.locationAddress || null,
            location: d.location || null,
            createdAt: d.createdAt,
          };
        });
        setRequests(mapped);
      } else {
        setRequests([]);
      }
    } catch (_err) {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleClearAll = () => {
    Alert.alert(
      'Clear Emergency Queue',
      'Dismiss all pending demo requests? They will be archived and marked as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.hospitals.clearRequests();
              await fetchRequests();
            } catch (_err) {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchRequests();
    const timer = setInterval(() => {
      fetchRequests();
    }, 3500);
    return () => clearInterval(timer);
  }, [fetchRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const openDetail = (id: string) => {
    setActiveHospitalRequestId(id);
    router.push('/(hospital)/request-detail');
  };

  const handleDismissRequest = async (id: string, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await api.hospitals.dismissRequest(id);
    } catch (_e) {}
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
        <TopBar
          title="Emergency Requests"
          back={true}
          onPressBack={() => router.replace('/(hospital)/dashboard')}
        />

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text style={styles.loadingText}>Fetching incoming requests...</Text>
          </View>
        )}

        {!loading && requests.length > 0 && (
          <View style={styles.queueHeader}>
            <Text style={styles.queueCount}>{requests.length} Pending Inbound {requests.length === 1 ? 'Alert' : 'Alerts'}</Text>
            <Pressable onPress={handleClearAll} style={styles.clearBtn} hitSlop={8}>
              <Icon name="close" size={12} color={colors.red} />
              <Text style={styles.clearBtnText}>Clear All</Text>
            </Pressable>
          </View>
        )}

        {!loading && requests.length === 0 && (
          <Card style={styles.emptyCard}>
            <Icon name="hospital" size={36} color={colors.inkSoft} />
            <Text style={styles.emptyTitle}>No Pending Emergency Requests</Text>
            <Text style={styles.emptySub}>
              All incoming emergency requests have been processed. Triage and bed dispatch queues are caught up.
            </Text>
          </Card>
        )}

        {!loading &&
          requests.map((r) => (
            <Card key={r.id} style={styles.card}>
              <Pressable onPress={() => openDetail(r.id)} style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Pill color={r.color}>{r.severity}</Pill>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.eta}>ETA {r.eta}</Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDismissRequest(r.id, e);
                      }}
                      hitSlop={8}
                      style={styles.cardDismissBtn}
                    >
                      <Icon name="close" size={12} color={colors.redDark} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.name}>{r.patientName} · {r.incidentType || 'Emergency'}</Text>
                <Text style={styles.locSub} numberOfLines={1}>
                  📍 {r.locationAddress || (r.location ? `${r.location.latitude?.toFixed(4)}°N, ${r.location.longitude?.toFixed(4)}°E` : 'GPS Shared')}
                </Text>
              </Pressable>
            </Card>
          ))}
      </Screen>
      <HospitalNav active="/(hospital)/requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10 },
  cardDismissBtn: {
    padding: 3,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { fontSize: 11, color: colors.inkFaint },
  name: { fontWeight: '700', fontSize: 13, marginTop: 8, color: colors.ink },
  locSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 3 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 20, justifyContent: 'center' },
  loadingText: { fontSize: 12, color: colors.inkFaint },
  emptyCard: { padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 12 },
  emptySub: { fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  queueCount: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FEE2E2', borderRadius: 6 },
  clearBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.red },
});

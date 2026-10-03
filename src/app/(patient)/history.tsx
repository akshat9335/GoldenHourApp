import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors, severityPillColor } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, PatientNav, Icon } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

export default function History() {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setEmergencyId = useAppStore((s) => s.setEmergencyId);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.emergencies.list();
      if (Array.isArray(data)) {
        setEmergencies(data);
      }
    } catch (err) {
      console.warn('Failed to load emergencies list:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusInfo = (status?: string) => {
    const s = String(status || 'PENDING').toUpperCase();
    if (s === 'COMPLETED') return { label: 'SUCCESSFULLY COMPLETED', color: 'success' as const };
    if (s === 'REJECTED' || s === 'CANCELLED') return { label: s, color: 'grey' as const };
    if (s.includes('HOSPITAL') || s.includes('EN_ROUTE') || s.includes('ARRIV') || s.includes('PATIENT')) {
      return { label: 'ACTIVE IN PROGRESS', color: 'blue' as const };
    }
    return { label: s, color: 'amber' as const };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <TopBar title="Incident & Health History" back={false} />

        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
          <View
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: colors.red,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🚨 Emergency Logs</Text>
          </View>
          <Pressable
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: '#EEF2FF',
              borderWidth: 1,
              borderColor: colors.blue,
            }}
            onPress={() => router.push('/(patient)/health-records' as any)}
          >
            <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 12 }}>📋 Health Records & Rx</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.red} />
            <Text style={{ marginTop: 12, color: colors.inkSoft, fontSize: 13 }}>
              Loading emergency logs...
            </Text>
          </View>
        ) : emergencies.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="history" size={36} color={colors.inkFaint} />
            <Text style={styles.emptyTitle}>No Emergency Records Yet</Text>
            <Text style={styles.emptySub}>
              All emergency dispatches, AI triage assessments, and hospital admissions will be logged here.
            </Text>
          </Card>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {emergencies.map((emg) => {
              const statusInfo = getStatusInfo(emg.status);
              const hospName =
                emg.assignedHospitalName ||
                emg.alertedHospitalName ||
                (emg.hospitalCandidates && emg.hospitalCandidates[0]?.name) ||
                'Verified Emergency Hospital';
              const sev = String(emg.severity || 'HIGH').toLowerCase();
              const dateText = formatDate(emg.createdAt);

              return (
                <Pressable
                  key={emg.id}
                  onPress={() => {
                    setEmergencyId(emg.id);
                    if (emg.status === 'COMPLETED') {
                      router.push('/(patient)/emergency/completed');
                    } else {
                      router.push('/(patient)/emergency/active');
                    }
                  }}
                >
                  <Card style={styles.card}>
                    <View style={styles.rowTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{emg.incidentType || 'Emergency Incident'}</Text>
                        <Text style={styles.sub}>{dateText} · {hospName}</Text>
                      </View>
                      <Pill color={severityPillColor(sev as any)}>
                        {String(emg.severity || 'HIGH').toUpperCase()}
                      </Pill>
                    </View>

                    <View style={styles.bottomRow}>
                      <Pill color={statusInfo.color}>{statusInfo.label}</Pill>
                      {emg.assignedAmbulanceId && (
                        <Text style={styles.unitText}>
                          🚑 Unit: {emg.assignedAmbulanceId}
                        </Text>
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Screen>
      <PatientNav active="/(patient)/history" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: colors.line },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 4 },
  bottomRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitText: { fontSize: 11, fontWeight: '600', color: colors.inkSoft },
  emptyCard: { padding: 32, alignItems: 'center', marginVertical: 20, borderWidth: 1.5, borderColor: colors.line },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 14 },
  emptySub: { fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});

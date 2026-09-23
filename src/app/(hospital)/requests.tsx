import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
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
  const [activeTab, setActiveTab] = useState<'EMERGENCIES' | 'REFERRALS'>('EMERGENCIES');
  const [requests, setRequests] = useState<HospitalRequestItem[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setActiveHospitalRequestId = useAppStore((s) => s.setActiveHospitalRequestId);
  const userProfile = useAppStore((s) => s.userProfile);
  const hospitalId = userProfile?.uid || 'hosp-srn-prayagraj';

  const fetchRequests = useCallback(async () => {
    try {
      const res: any = await api.hospitals.getRequests();
      const raw = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(raw)) {
        const pending = raw.filter((d: any) => {
          const s = String(d.status || 'NEW').toUpperCase();
          return s === 'NEW' || s === 'PENDING' || s === 'QUEUED_STANDBY';
        });

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
    }
  }, []);

  const fetchReferrals = useCallback(async () => {
    try {
      const res: any = await api.referrals.getHospitalReferrals(hospitalId);
      const raw = Array.isArray(res) ? res : (res?.data || []);
      setReferrals(raw);
    } catch (_err) {
      setReferrals([]);
    }
  }, [hospitalId]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchRequests(), fetchReferrals()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchRequests, fetchReferrals]);

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => {
      loadAll();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
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

  const handleAcceptReferral = async (id: string) => {
    try {
      await api.referrals.updateStatus(id, 'ACCEPTED');
      setReferrals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'ACCEPTED' } : r))
      );
      Alert.alert('Referral Accepted', 'Patient admitted to incoming tertiary transfer queue.');
    } catch (_err) {
      Alert.alert('Update Failed', 'Could not accept referral.');
    }
  };

  const handleCompleteReferral = async (id: string) => {
    try {
      await api.referrals.updateStatus(id, 'COMPLETED');
      setReferrals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'COMPLETED' } : r))
      );
      Alert.alert('Referral Completed', 'Patient admission workflow finalized.');
    } catch (_err) {
      Alert.alert('Update Failed', 'Could not complete referral.');
    }
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
          title="Hospital Inbound Intake"
          back={true}
          onPressBack={() => router.replace('/(hospital)/dashboard')}
        />

        {/* Tab switcher: Emergency vs Doctor Referrals (Phase 4) */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'EMERGENCIES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('EMERGENCIES')}
          >
            <Text style={[styles.tabText, activeTab === 'EMERGENCIES' && styles.tabTextActive]}>
              🚨 Emergencies ({requests.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'REFERRALS' && styles.tabBtnActiveBlue]}
            onPress={() => setActiveTab('REFERRALS')}
          >
            <Text style={[styles.tabText, activeTab === 'REFERRALS' && styles.tabTextActive]}>
              🏥 Referrals ({referrals.length})
            </Text>
          </Pressable>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text style={styles.loadingText}>Fetching incoming requests...</Text>
          </View>
        )}

        {/* Tab 1: Emergency Requests */}
        {activeTab === 'EMERGENCIES' && !loading && (
          <>
            {requests.length > 0 && (
              <View style={styles.queueHeader}>
                <Text style={styles.queueCount}>{requests.length} Pending Inbound {requests.length === 1 ? 'Alert' : 'Alerts'}</Text>
                <Pressable onPress={handleClearAll} style={styles.clearBtn} hitSlop={8}>
                  <Icon name="close" size={12} color={colors.red} />
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </Pressable>
              </View>
            )}

            {requests.length === 0 && (
              <Card style={styles.emptyCard}>
                <Icon name="hospital" size={36} color={colors.inkSoft} />
                <Text style={styles.emptyTitle}>No Pending Emergency Requests</Text>
                <Text style={styles.emptySub}>
                  All incoming emergency requests have been processed. Triage and bed dispatch queues are caught up.
                </Text>
              </Card>
            )}

            {requests.map((r) => (
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
                  <Text style={styles.patient}>{r.patientName}</Text>
                  <Text style={styles.incidentType}>{r.incidentType}</Text>
                  {r.locationAddress && (
                    <Text style={styles.address} numberOfLines={1}>
                      📍 {r.locationAddress}
                    </Text>
                  )}
                  <View style={styles.actionPrompt}>
                    <Text style={styles.actionPromptText}>Tap to review triage, dispatch & admit →</Text>
                  </View>
                </Pressable>
              </Card>
            ))}
          </>
        )}

        {/* Tab 2: Doctor Referrals (Phase 4) */}
        {activeTab === 'REFERRALS' && !loading && (
          <>
            {referrals.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="doctor" size={36} color={colors.inkSoft} />
                <Text style={styles.emptyTitle}>No Doctor Referrals</Text>
                <Text style={styles.emptySub}>
                  When OPD and emergency doctors refer patients to this hospital, they will appear here with priority tags.
                </Text>
              </Card>
            ) : (
              referrals.map((ref) => (
                <Card key={ref.id} style={styles.referralCard}>
                  <View style={styles.row}>
                    <Pill color={ref.priority === 'HIGH' ? 'red' : 'grey'}>
                      {ref.priority} PRIORITY
                    </Pill>
                    <Pill color={ref.status === 'ACCEPTED' ? 'success' : ref.status === 'COMPLETED' ? 'blue' : 'amber'}>
                      {ref.status}
                    </Pill>
                  </View>

                  <Text style={styles.patient}>{ref.patientName}</Text>
                  <Text style={styles.refSub}>Referred by: {ref.doctorName}</Text>
                  <Text style={styles.refReason}>Reason: {ref.reason}</Text>

                  {ref.notes ? <Text style={styles.refNotes}>Notes: {ref.notes}</Text> : null}

                  <View style={styles.refActions}>
                    {ref.status === 'PENDING' && (
                      <Button
                        title="Accept Referral & Reserve Bed"
                        variant="blue"
                        style={{ flex: 1 }}
                        onPress={() => handleAcceptReferral(ref.id)}
                      />
                    )}
                    {ref.status === 'ACCEPTED' && (
                      <Button
                        title="Patient Arrived · Complete Admission"
                        variant="primary"
                        style={{ flex: 1 }}
                        onPress={() => handleCompleteReferral(ref.id)}
                      />
                    )}
                    {ref.status === 'COMPLETED' && (
                      <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>
                        ✓ Admitted & Transferred
                      </Text>
                    )}
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </Screen>
      <HospitalNav active="/(hospital)/requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: {
    backgroundColor: colors.red,
  },
  tabBtnActiveBlue: {
    backgroundColor: colors.blue,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
  },
  tabTextActive: {
    color: '#fff',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 2,
  },
  queueCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.bannerRedBg,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.red,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eta: {
    fontSize: 12,
    color: colors.inkSoft,
    fontWeight: '700',
  },
  cardDismissBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: colors.bannerRedBg,
  },
  patient: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 8,
  },
  incidentType: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.redDark,
    marginTop: 2,
  },
  address: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 4,
  },
  actionPrompt: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionPromptText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.red,
  },
  referralCard: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  refSub: { fontSize: 12, color: colors.inkSoft, marginTop: 4, fontWeight: '600' },
  refReason: { fontSize: 13, color: colors.ink, marginTop: 6 },
  refNotes: { fontSize: 11.5, color: colors.inkFaint, marginTop: 4, fontStyle: 'italic' },
  refActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
});

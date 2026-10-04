import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, HospitalNav, Icon, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const seen = new Set<string>();
      const patientMap = new Map<string, any>();
      for (const r of raw) {
        if (!r || !r.id || seen.has(r.id)) continue;
        if (!r.patientName || r.patientName === 'undefined') continue;
        seen.add(r.id);

        const patientKey = `${(r.patientName || '').toLowerCase().trim()}_${r.patientId || ''}`;
        const existing = patientMap.get(patientKey);
        if (!existing) {
          patientMap.set(patientKey, r);
        } else {
          const isRActive = r.status === 'PENDING' || r.status === 'ACCEPTED' || r.status === 'ADMITTED';
          const isExistActive = existing.status === 'PENDING' || existing.status === 'ACCEPTED' || existing.status === 'ADMITTED';
          if (isRActive && !isExistActive) {
            patientMap.set(patientKey, r);
          } else if (isRActive === isExistActive) {
            if (new Date(r.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime()) {
              patientMap.set(patientKey, r);
            }
          }
        }
      }
      setReferrals(Array.from(patientMap.values()));
    } catch (_err) {
      setReferrals([]);
    }
  }, [hospitalId]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchRequests(), fetchReferrals()]);
    if (hospitalId) {
      AsyncStorage.setItem(`@golden_hour_last_seen_referral_${hospitalId}`, String(Date.now())).catch(() => {});
    }
    setLoading(false);
    setRefreshing(false);
  }, [fetchRequests, fetchReferrals, hospitalId]);

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
        prev.map((r) => (r.id === id ? { ...r, status: 'ACCEPTED', bedReserved: true } : r))
      );
      Alert.alert(
        'Referral Accepted & Bed Reserved',
        '1 hospital bed has been reserved in this facility for incoming patient transfer.'
      );
    } catch (_err) {
      Alert.alert('Update Failed', 'Could not accept referral.');
    }
  };

  const handleDismissReferral = async (id: string, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      setReferrals((prev) => prev.filter((r) => r.id !== id));
      await api.referrals.dismiss(id);
    } catch (_e) {}
  };

  const handleCompleteReferral = async (id: string) => {
    try {
      await api.referrals.updateStatus(id, 'COMPLETED');
      setReferrals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'COMPLETED', bedReserved: true } : r))
      );
      Alert.alert(
        'Patient Admitted to ER',
        'Patient has arrived and is admitted in active ER treatment. The bed remains reserved until patient discharge.'
      );
    } catch (_err) {
      Alert.alert('Update Failed', 'Could not complete admission.');
    }
  };

  const handleDischargeReferral = (refItem: any) => {
    const patientName = refItem.patientName || 'Referred Patient';
    Alert.alert(
      'Discharge Patient & Free Bed?',
      `Confirm discharge for ${patientName}?\n\n• Frees up 1 reserved hospital bed\n• Finalizes patient referral case`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Discharge',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.referrals.updateStatus(refItem.id, 'DISCHARGED');
              setReferrals((prev) =>
                prev.map((r) => (r.id === refItem.id ? { ...r, status: 'DISCHARGED', bedReserved: false } : r))
              );
              Alert.alert('Patient Discharged', `${patientName} has been discharged and 1 bed is now freed.`);
            } catch (_err) {
              Alert.alert('Update Failed', 'Could not discharge referral patient.');
            }
          },
        },
      ]
    );
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
            {referrals.length > 0 && (
              <View style={styles.queueHeader}>
                <Text style={styles.queueCount}>{referrals.length} Total {referrals.length === 1 ? 'Referral' : 'Referrals'}</Text>
                {referrals.some((r) => r.status === 'COMPLETED') && (
                  <Pressable
                    onPress={() => {
                      const completed = referrals.filter((r) => r.status === 'COMPLETED');
                      setReferrals((prev) => prev.filter((r) => r.status !== 'COMPLETED'));
                      completed.forEach((c) => api.referrals.dismiss(c.id).catch(() => {}));
                    }}
                    style={styles.clearBtn}
                    hitSlop={8}
                  >
                    <Icon name="close" size={12} color={colors.red} />
                    <Text style={styles.clearBtnText}>Clear Completed</Text>
                  </Pressable>
                )}
              </View>
            )}

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Pill color={ref.priority === 'HIGH' ? 'red' : 'grey'}>
                        {ref.priority} PRIORITY
                      </Pill>
                      <Pill color={ref.status === 'ACCEPTED' ? 'success' : (ref.status === 'COMPLETED' || ref.status === 'ADMITTED') ? 'blue' : ref.status === 'DISCHARGED' ? 'grey' : 'amber'}>
                        {ref.status === 'ACCEPTED' ? 'BED RESERVED' : (ref.status === 'COMPLETED' || ref.status === 'ADMITTED') ? 'ADMITTED' : ref.status === 'DISCHARGED' ? 'DISCHARGED' : ref.status}
                      </Pill>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDismissReferral(ref.id, e);
                      }}
                      hitSlop={8}
                      style={styles.cardDismissBtn}
                    >
                      <Icon name="close" size={12} color={colors.redDark} />
                    </Pressable>
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
                        title="Patient Arrived · Admit to ER (Bed Reserved ✓)"
                        variant="primary"
                        style={{ flex: 1 }}
                        onPress={() => handleCompleteReferral(ref.id)}
                      />
                    )}
                    {(ref.status === 'COMPLETED' || ref.status === 'ADMITTED') && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>
                            ✓ Admitted in ER (Bed Reserved)
                          </Text>
                          <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>
                            Active inpatient treatment
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleDischargeReferral(ref)}
                          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.bannerRedBg, borderWidth: 1, borderColor: '#FECACA' }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.redDark }}>✅ Discharge & Free Bed</Text>
                        </Pressable>
                      </View>
                    )}
                    {ref.status === 'DISCHARGED' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: colors.inkSoft, fontWeight: '700' }}>
                          ✓ Discharged · Bed Freed
                        </Text>
                        <Pressable
                          onPress={() => handleDismissReferral(ref.id)}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F1F5F9' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft }}>Dismiss ✕</Text>
                        </Pressable>
                      </View>
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

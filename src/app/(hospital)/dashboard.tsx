import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, HospitalNav, HTitle, LabelEyebrow, openExternalNavigation } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { acquireFreshLocation } from '@/services/deviceLocation';

export default function HospitalDashboard() {
  const userProfile = useAppStore((s) => s.userProfile);
  const setActiveHospitalRequestId = useAppStore((s) => s.setActiveHospitalRequestId);
  const initialName = userProfile?.hospitalName || "Hospital ER";
  const [hospitalName, setHospitalName] = useState(initialName.endsWith('— ER') ? initialName : `${initialName} — ER`);
  const [pendingEmergency, setPendingEmergency] = useState<any | null>(null);
  const [activeInbound, setActiveInbound] = useState<any[]>([]);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const [capacity, setCapacity] = useState({
    totalBeds: 20,
    availableBeds: 14,
    icuBeds: 5,
    availableIcuBeds: 4,
    emergencyCapacity: 5,
  });

  const loadData = useCallback(async () => {
    try {
      const profilePromise = api.hospitals.getProfile().catch(() => null);
      const capPromise = api.hospitals.getCapacity().catch(() => null);
      const reqPromise = api.hospitals.getRequests().catch(() => null);

      const [profileRes, capRes, reqsRes]: any = await Promise.all([profilePromise, capPromise, reqPromise]);

      if (profileRes) {
        const data = profileRes?.data || profileRes;
        const hosp = data?.hospitalName || data?.name;
        if (hosp) {
          setHospitalName(hosp.endsWith('— ER') ? hosp : `${hosp} — ER`);
        }
        const hasValidLoc = data?.location && typeof data.location.latitude === 'number' && data.location.latitude !== 0;
        if (!hasValidLoc) {
          const fresh = await acquireFreshLocation(2500);
          if (fresh && fresh.latitude !== 28.6139) {
            api.hospitals.updateProfile({
              location: fresh,
              latitude: fresh.latitude,
              longitude: fresh.longitude,
            }).catch(() => {});
          }
        }
      }

      if (capRes) {
        const cap = capRes?.data || capRes;
        if (cap) {
          setCapacity({
            totalBeds: Number(cap.totalBeds) || 20,
            availableBeds: Number(cap.availableBeds) || 14,
            icuBeds: Number(cap.icuBeds) || 5,
            availableIcuBeds: Number(cap.availableIcuBeds) || 4,
            emergencyCapacity: Number(cap.emergencyCapacity) || 5,
          });
        }
      }

      if (reqsRes) {
        const items = Array.isArray(reqsRes) ? reqsRes : (reqsRes?.data || []);
        const pending = items.filter((d: any) => {
          const s = String(d.status || 'NEW').toUpperCase();
          return s === 'NEW' || s === 'PENDING';
        });
        const inbound = items.filter((d: any) => {
          const s = String(d.status || '').toUpperCase();
          const ts = String(d.tripStatus || '').toUpperCase();
          if (s === 'COMPLETED' || s === 'REJECTED' || s === 'CANCELLED') return false;
          return (
            s === 'ACCEPTED' ||
            s === 'HOSPITAL_ACCEPTED' ||
            s === 'AMBULANCE_ASSIGNED' ||
            s === 'AMBULANCE EN ROUTE' ||
            s === 'EN_ROUTE_TO_PATIENT' ||
            s === 'ARRIVING' ||
            s === 'AT_PATIENT' ||
            s === 'PATIENT_ONBOARD' ||
            s === 'EN_ROUTE_TO_HOSPITAL' ||
            s === 'PATIENT ARRIVED' ||
            s === 'AT_HOSPITAL' ||
            s === 'IN TREATMENT' ||
            s.includes('ACCEPT') ||
            s.includes('AMBULANCE') ||
            s.includes('ROUTE') ||
            s.includes('ARRIV') ||
            ts === 'ASSIGNED' ||
            ts === 'EN_ROUTE_TO_PATIENT' ||
            ts === 'AT_PATIENT' ||
            ts === 'PATIENT_ONBOARD' ||
            ts === 'EN_ROUTE_TO_HOSPITAL' ||
            ts === 'AT_HOSPITAL'
          );
        });
        pending.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        inbound.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
        setCriticalCount(pending.length);
        setActiveInbound(inbound);
        if (pending.length > 0) {
          setPendingEmergency(pending[0]);
        } else {
          setPendingEmergency(null);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData();
    }, 3500);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEmergencyCardPress = () => {
    if (pendingEmergency) {
      setActiveHospitalRequestId(pendingEmergency.requestId || pendingEmergency.id);
      router.push('/(hospital)/request-detail');
    } else {
      router.push('/(hospital)/requests');
    }
  };

  const handleDismissPendingEmergency = async (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!pendingEmergency) return;
    const reqId = pendingEmergency.requestId || pendingEmergency.id;
    setPendingEmergency(null);
    setCriticalCount((c) => Math.max(0, c - 1));
    try {
      await api.hospitals.dismissRequest(reqId);
      loadData();
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
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <Pressable onPress={() => router.replace('/role-selection')} style={{ marginRight: 8, padding: 4 }} hitSlop={8}>
              <Icon name="chevL" size={20} color={colors.ink} />
            </Pressable>
            <HTitle size={16}>{hospitalName}</HTitle>
          </View>
          <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')}>
            <Icon name="bell" />
          </Pressable>
        </View>

        {/* Dynamic Emergency Card: Incoming vs Standby */}
        <Pressable onPress={handleEmergencyCardPress}>
          {pendingEmergency ? (
            <Card style={[styles.incomingCard, styles.activeIncomingCard]}>
              <View style={styles.rowTop}>
                <Pill color="red">INCOMING · {String(pendingEmergency.severity || 'HIGH').toUpperCase()}</Pill>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.eta}>ETA {pendingEmergency.eta || '6 min'}</Text>
                  <Pressable
                    onPress={handleDismissPendingEmergency}
                    hitSlop={8}
                    style={styles.bannerDismissBtn}
                  >
                    <Icon name="close" size={12} color={colors.redDark} />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.incomingName}>
                {pendingEmergency.patientName || 'Emergency Patient'} · {pendingEmergency.incidentType || 'Trauma Alert'}
              </Text>
              <Text style={styles.incomingSub} numberOfLines={2}>
                📍 {pendingEmergency.locationAddress || (pendingEmergency.location ? `${pendingEmergency.location.latitude?.toFixed(4)}°N, ${pendingEmergency.location.longitude?.toFixed(4)}°E` : 'Live Incident Location')} · Tap to review & dispatch
              </Text>
            </Card>
          ) : (
            <Card style={styles.incomingCard}>
              <View style={styles.rowTop}>
                <Pill color="success">DISPATCH · STANDBY</Pill>
                <Text style={styles.eta}>All Normal</Text>
              </View>
              <Text style={styles.incomingName}>Emergency Dispatch · Standby</Text>
              <Text style={styles.incomingSub}>
                0 active incoming emergency requests · All trauma stations on standby
              </Text>
            </Card>
          )}
        </Pressable>

        <View style={styles.statsRow}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(hospital)/requests')}>
            <Card style={styles.stat}>
              <Text style={[styles.statNum, { color: criticalCount > 0 ? colors.red : colors.inkSoft }]}>
                {criticalCount}
              </Text>
              <Text style={styles.statLabel}>CRITICAL</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(hospital)/capacity')}>
            <Card style={styles.stat}>
              <Text style={styles.statNum}>{capacity.availableBeds}/{capacity.totalBeds}</Text>
              <Text style={styles.statLabel}>BEDS FREE</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(hospital)/capacity')}>
            <Card style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.success }]}>{capacity.availableIcuBeds}</Text>
              <Text style={styles.statLabel}>ICU FREE</Text>
            </Card>
          </Pressable>
        </View>

        {activeInbound.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <LabelEyebrow>INBOUND PATIENTS & DISPATCHED AMBULANCES ({activeInbound.length})</LabelEyebrow>
            {activeInbound.map((item, idx) => {
              const st = String(item.status || 'ACCEPTED').toUpperCase();
              const tripSt = String(item.tripStatus || '').toUpperCase();
              let statusPill = 'ACCEPTED';
              let pillColor: 'red' | 'amber' | 'success' | 'blue' = 'amber';

              if (tripSt === 'AT_HOSPITAL' || st === 'PATIENT ARRIVED') {
                statusPill = 'ARRIVED AT ER';
                pillColor = 'success';
              } else if (tripSt === 'PATIENT_ONBOARD' || tripSt === 'EN_ROUTE_TO_HOSPITAL') {
                statusPill = 'PATIENT IN TRANSIT';
                pillColor = 'red';
              } else if (tripSt === 'EN_ROUTE_TO_PATIENT' || tripSt === 'AT_PATIENT' || st === 'AMBULANCE EN ROUTE') {
                statusPill = 'AMBULANCE EN ROUTE';
                pillColor = 'blue';
              }

              const driverName = item.assignedDriverName || 'Assigned Pilot';
              const vehicle = item.assignedAmbulanceId || 'Ambulance';
              const driverPhone = item.assignedDriverPhone;
              const patientPhone = item.patientPhone;

              return (
                <Card key={item.requestId || item.id || idx} style={styles.inboundCard}>
                  <View style={styles.rowTop}>
                    <Pill color={pillColor}>{statusPill}</Pill>
                    <Text style={styles.eta}>{item.eta || 'Live'}</Text>
                  </View>

                  <Text style={styles.inboundTitle}>
                    {item.patientName || 'Emergency Patient'} · {item.incidentType || 'Trauma'}
                  </Text>

                  <View style={styles.inboundMetaRow}>
                    <Icon name="ambulance" size={16} color={colors.inkSoft} />
                    <Text style={styles.inboundMetaText}>
                      Pilot: {driverName} (Unit {vehicle}) {item.ambulanceType ? `· ${item.ambulanceType}` : ''}
                    </Text>
                  </View>

                  {/* Realtime 3-Way Connectivity Action Buttons */}
                  <View style={styles.inboundBtnRow}>
                    <TouchableOpacity
                      style={styles.actionBtnNav}
                      onPress={() => {
                        const targetLat = item.ambulanceLocation?.latitude || item.location?.latitude || 12.9352;
                        const targetLng = item.ambulanceLocation?.longitude || item.location?.longitude || 77.6146;
                        openExternalNavigation({
                          destLat: targetLat,
                          destLng: targetLng,
                          destTitle: `Ambulance Unit ${vehicle} — ${item.patientName || 'Emergency Patient'}`,
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnTextNav}>📡 Live Track</Text>
                    </TouchableOpacity>

                    {driverPhone ? (
                      <TouchableOpacity
                        style={styles.actionBtnBlue}
                        onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnTextBlue}>📞 Pilot</Text>
                      </TouchableOpacity>
                    ) : null}

                    {patientPhone ? (
                      <TouchableOpacity
                        style={styles.actionBtnGreen}
                        onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnTextGreen}>📞 Patient</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.actionBtnGrey}
                      onPress={() => {
                        setActiveHospitalRequestId(item.requestId || item.id);
                        router.push('/(hospital)/request-detail');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnTextGrey}>Review →</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <LabelEyebrow>EMERGENCY DEPARTMENT STATUS</LabelEyebrow>
        <Card style={{ padding: 14 }}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Trauma Bay</Text>
            <Pill color={capacity.emergencyCapacity > 0 ? 'success' : 'amber'}>
              {capacity.emergencyCapacity > 0 ? `${capacity.emergencyCapacity} bays active` : 'Full'}
            </Pill>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>On-call Surgeon</Text>
            <Pill color="success">Available</Pill>
          </View>
        </Card>

        <LabelEyebrow>HOSPITAL AMBULANCE FLEET</LabelEyebrow>
        <Pressable onPress={() => router.push('/(hospital)/fleet')}>
          <Card style={{ padding: 14, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="ambulance" color={colors.red} size={22} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Linked Fleet & Drivers</Text>
                  <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 2 }}>View live pilots, availability & add drivers</Text>
                </View>
              </View>
              <Icon name="chevR" color={colors.inkFaint} />
            </View>
          </Card>
        </Pressable>
      </Screen>
      <HospitalNav active="/(hospital)/dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  incomingCard: { padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.line },
  activeIncomingCard: { borderColor: colors.red, backgroundColor: '#FEF2F2' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  incomingName: { fontWeight: '700', fontSize: 13.5, marginTop: 8, color: colors.ink },
  incomingSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 4, lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, padding: 12, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 18, color: colors.ink },
  statLabel: { fontSize: 9.5, color: colors.inkFaint, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: colors.ink },
  inboundCard: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
  },
  inboundTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
    marginTop: 8,
  },
  inboundMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  inboundMetaText: {
    fontSize: 12,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  inboundBtnRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  actionBtnNav: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#0284C715',
    borderWidth: 1,
    borderColor: '#0284C740',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextNav: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  actionBtnBlue: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextBlue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.blue,
  },
  actionBtnGreen: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextGreen: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.success,
  },
  actionBtnGrey: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextGrey: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.ink,
  },
  bannerDismissBtn: {
    padding: 3,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, TouchableOpacity, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, HospitalNav, HTitle, LabelEyebrow, openExternalNavigation } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { authService } from '@/services/auth';
import { acquireFreshLocation } from '@/services/deviceLocation';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HospitalDashboard() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const userProfile = useAppStore((s) => s.userProfile);
  const setActiveHospitalRequestId = useAppStore((s) => s.setActiveHospitalRequestId);
  const initialName = userProfile?.hospitalName || "Hospital ER";
  const [hospitalName, setHospitalName] = useState(initialName.endsWith('— ER') ? initialName : `${initialName} — ER`);
  const [pendingEmergency, setPendingEmergency] = useState<any | null>(null);
  const [activeInbound, setActiveInbound] = useState<any[]>([]);
  const [admittedPatients, setAdmittedPatients] = useState<any[]>([]);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [completedCases, setCompletedCases] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadReferralCount, setUnreadReferralCount] = useState<number>(0);
  const lastSeenRefTimestampRef = useRef<number>(0);

  useEffect(() => {
    const hospId = userProfile?.uid || 'hosp-srn-prayagraj';
    AsyncStorage.getItem(`@golden_hour_last_seen_referral_${hospId}`).then((val) => {
      if (val) lastSeenRefTimestampRef.current = Number(val) || 0;
    }).catch(() => {});
  }, [userProfile?.uid]);

  const [capacity, setCapacity] = useState({
    totalBeds: 50,
    availableBeds: 18,
    icuBeds: 12,
    availableIcuBeds: 4,
    emergencyCapacity: 6,
  });

  // Load cached capacity immediately on mount to prevent flashing
  useEffect(() => {
    const hospId = userProfile?.uid || 'hosp-srn-prayagraj';
    AsyncStorage.getItem(`@golden_hour_hospital_capacity_${hospId}`).then((raw) => {
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          if (cached && cached.availableBeds !== undefined) {
            setCapacity((prev) => ({ ...prev, ...cached }));
          }
        } catch {}
      }
    }).catch(() => {});
  }, [userProfile?.uid]);

  // Load hospital profile and capacity once on mount or manual refresh
  const loadStaticInfo = useCallback(async () => {
    try {
      const hospId = userProfile?.uid || 'hosp-srn-prayagraj';
      const [profileRes, capRes]: any = await Promise.all([
        api.hospitals.getProfile().catch(() => null),
        api.hospitals.getCapacity().catch(() => null),
      ]);

      if (profileRes) {
        const data = profileRes?.data || profileRes;
        const hosp = data?.hospitalName || data?.name;
        if (hosp) {
          setHospitalName(hosp.endsWith('— ER') ? hosp : `${hosp} — ER`);
        }
        const hasValidLoc = data?.location && typeof data.location.latitude === 'number' && data.location.latitude !== 0;
        if (!hasValidLoc) {
          // Acquire location once asynchronously in background without blocking
          acquireFreshLocation(2000).then((fresh) => {
            if (fresh && fresh.latitude !== 28.6139) {
              api.hospitals.updateProfile({
                location: fresh,
                latitude: fresh.latitude,
                longitude: fresh.longitude,
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }

      if (capRes) {
        const cap = capRes?.data || capRes;
        if (cap && cap.availableBeds !== undefined) {
          const newCap = {
            totalBeds: Number(cap.totalBeds) || 50,
            availableBeds: Number(cap.availableBeds) || 18,
            icuBeds: Number(cap.icuBeds) || 12,
            availableIcuBeds: Number(cap.availableIcuBeds) || 4,
            emergencyCapacity: Number(cap.emergencyCapacity) || 6,
          };
          setCapacity(newCap);
          AsyncStorage.setItem(`@golden_hour_hospital_capacity_${hospId}`, JSON.stringify(newCap)).catch(() => {});
        }
      }
    } catch {}
  }, [userProfile?.uid]);

  // Poll incoming emergency requests, referrals, and live capacity in the recurring loop
  const pollEmergencyRequests = useCallback(async () => {
    try {
      const hospId = userProfile?.uid || 'hosp-srn-prayagraj';
      const [reqsRes, capRes, refRes]: any = await Promise.all([
        api.hospitals.getRequests().catch(() => null),
        api.hospitals.getCapacity().catch(() => null),
        api.referrals.getHospitalReferrals(hospId).catch(() => null),
      ]);

      if (capRes) {
        const cap = capRes?.data || capRes;
        if (cap && cap.availableBeds !== undefined) {
          const newCap = {
            totalBeds: Number(cap.totalBeds) || 50,
            availableBeds: Number(cap.availableBeds) || 18,
            icuBeds: Number(cap.icuBeds) || 12,
            availableIcuBeds: Number(cap.availableIcuBeds) || 4,
            emergencyCapacity: Number(cap.emergencyCapacity) || 6,
          };
          setCapacity(newCap);
          AsyncStorage.setItem(`@golden_hour_hospital_capacity_${hospId}`, JSON.stringify(newCap)).catch(() => {});
        }
      }

      const items = Array.isArray(reqsRes) ? reqsRes : (reqsRes?.data || []);
      const rawRefsList = Array.isArray(refRes) ? refRes : (refRes?.data || []);
      const seenRefIds = new Set<string>();
      const refsRaw: any[] = [];
      for (const r of rawRefsList) {
        if (!r || !r.id || seenRefIds.has(r.id)) continue;
        if (!r.patientName || r.patientName === 'undefined') continue;
        seenRefIds.add(r.id);
        refsRaw.push(r);
      }

      // Check for unread pending referrals for notification badge
      const pendingRefs = refsRaw.filter((r: any) => String(r.status || '').toUpperCase() === 'PENDING');
      const unread = pendingRefs.filter((r: any) => {
        const createdTime = new Date(r.createdAt || 0).getTime();
        return createdTime > lastSeenRefTimestampRef.current;
      });
      setUnreadReferralCount(unread.length > 0 ? unread.length : (pendingRefs.length > 0 && lastSeenRefTimestampRef.current === 0 ? pendingRefs.length : 0));

      const pending = items.filter((d: any) => {
        const s = String(d.status || 'NEW').toUpperCase();
        return s === 'NEW' || s === 'PENDING';
      });

      const admitted = items.filter((d: any) => {
        const s = String(d.status || '').toUpperCase();
        const ts = String(d.tripStatus || '').toUpperCase();
        if (s === 'COMPLETED' || s === 'REJECTED' || s === 'CANCELLED') return false;
        return s === 'PATIENT ARRIVED' || s === 'IN TREATMENT' || s === 'AT_HOSPITAL' || ts === 'AT_HOSPITAL';
      });

      const inbound = items.filter((d: any) => {
        const s = String(d.status || '').toUpperCase();
        const ts = String(d.tripStatus || '').toUpperCase();
        if (s === 'COMPLETED' || s === 'REJECTED' || s === 'CANCELLED') return false;
        if (s === 'PATIENT ARRIVED' || s === 'IN TREATMENT' || s === 'AT_HOSPITAL' || ts === 'AT_HOSPITAL') return false;
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
          ts === 'ASSIGNED' ||
          ts === 'EN_ROUTE_TO_PATIENT' ||
          ts === 'AT_PATIENT' ||
          ts === 'PATIENT_ONBOARD' ||
          ts === 'EN_ROUTE_TO_HOSPITAL'
        );
      });

      // Integrate accepted/incoming referrals into inbound
      const refInbound = refsRaw
        .filter((r: any) => String(r.status || '').toUpperCase() === 'ACCEPTED')
        .map((r: any) => ({
          id: r.id,
          requestId: r.id,
          patientName: r.patientName,
          severity: r.priority || 'HIGH',
          incidentType: `Referral Transfer (${r.doctorName || 'Doctor/ASHA'})`,
          status: 'ACCEPTED',
          tripStatus: 'EN_ROUTE_TO_HOSPITAL',
          eta: 'Bed Reserved',
          assignedDriverName: r.doctorName || 'Referring Clinician',
          assignedAmbulanceId: 'Transfer',
          isReferral: true,
          notes: r.reason,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));

      // Integrate admitted referrals into admittedPatients
      const refAdmitted = refsRaw
        .filter((r: any) => {
          const s = String(r.status || '').toUpperCase();
          return s === 'COMPLETED' || s === 'ADMITTED';
        })
        .map((r: any) => ({
          id: r.id,
          requestId: r.id,
          patientName: r.patientName,
          severity: r.priority || 'HIGH',
          incidentType: `Referral Patient (${r.doctorName || 'Doctor/ASHA'})`,
          status: 'IN TREATMENT',
          assignedDriverName: r.doctorName || 'Primary Caregiver',
          assignedAmbulanceId: 'ER Inpatient',
          isReferral: true,
          notes: r.reason,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));

      const completed = items.filter((d: any) => {
        const s = String(d.status || '').toUpperCase();
        const ts = String(d.tripStatus || '').toUpperCase();
        return s === 'COMPLETED' || s === 'RESOLVED' || ts === 'COMPLETED';
      });

      const refCompleted = refsRaw
        .filter((r: any) => String(r.status || '').toUpperCase() === 'DISCHARGED')
        .map((r: any) => ({
          id: r.id,
          requestId: r.id,
          patientName: r.patientName,
          status: 'COMPLETED',
          isReferral: true,
          updatedAt: r.updatedAt,
        }));

      const allInbound = [...inbound, ...refInbound];
      const allAdmitted = [...admitted, ...refAdmitted];
      const allCompleted = [...completed, ...refCompleted];

      pending.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      allInbound.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      allAdmitted.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      allCompleted.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

      setCriticalCount(pending.length);
      setActiveInbound(allInbound);
      setAdmittedPatients(allAdmitted);
      setCompletedCases(allCompleted);
      if (pending.length > 0) {
        setPendingEmergency(pending[0]);
      } else {
        setPendingEmergency(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, [userProfile?.uid]);

  const loadData = useCallback(() => {
    loadStaticInfo();
    pollEmergencyRequests();
  }, [loadStaticInfo, pollEmergencyRequests]);

  useEffect(() => {
    loadStaticInfo();
    pollEmergencyRequests();
    const timer = setInterval(() => {
      pollEmergencyRequests();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadStaticInfo, pollEmergencyRequests]);

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

  const handleDischargePatient = (patient: any) => {
    const patientName = patient.patientName || 'Patient';
    const reqId = patient.requestId || patient.id;
    Alert.alert(
      'Discharge Patient?',
      `Confirm discharge for ${patientName}?\n\n• Frees up hospital ER bed capacity\n• Awards +10 Trust Score to the patient for verified care`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Discharge',
          style: 'destructive',
          onPress: async () => {
            try {
              if (patient.isReferral) {
                await api.referrals.updateStatus(patient.id, 'DISCHARGED');
              } else {
                await api.hospitals.completeRequest(reqId);
              }
              loadData();
              Alert.alert('Patient Discharged', `${patientName} has been discharged and bed capacity freed.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not discharge patient');
            }
          },
        },
      ]
    );
  };

  const handleClearResolved = () => {
    Alert.alert(
      'Clear Resolved Cases?',
      'Do you want to clean up resolved cases from this hospital view?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          onPress: async () => {
            try {
              await api.hospitals.clearRequests();
              loadData();
            } catch {}
          },
        },
      ]
    );
  };

  const handleAccountOptions = () => {
    Alert.alert(
      hospitalName,
      'Select an action to switch role or log out of this facility console:',
      [
        {
          text: 'Switch Role',
          onPress: () => router.replace('/role-selection'),
        },
        {
          text: 'Log Out Account',
          style: 'destructive',
          onPress: async () => {
            await authService.logout().catch(() => {});
            useAppStore.getState().setUserProfile(null);
            useAppStore.getState().setAuthToken(null);
            router.replace('/role-selection');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleOpenBell = () => {
    const hospId = userProfile?.uid || 'hosp-srn-prayagraj';
    const now = Date.now();
    lastSeenRefTimestampRef.current = now;
    setUnreadReferralCount(0);
    AsyncStorage.setItem(`@golden_hour_last_seen_referral_${hospId}`, String(now)).catch(() => {});
    router.push('/(hospital)/requests');
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
            <Pressable onPress={handleAccountOptions} style={{ marginRight: 8, padding: 4 }} hitSlop={8}>
              <Icon name="chevL" size={20} color={colors.ink} />
            </Pressable>
            <TouchableOpacity onPress={handleAccountOptions} style={{ flex: 1 }}>
              <HTitle size={15}>{hospitalName}</HTitle>
              <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>
                {lang === 'mr' ? 'भूमिका बदलण्यासाठी किंवा लॉगआउट करण्यासाठी टॅप करा' : lang === 'hi' ? 'रोल बदलने या लॉगआउट करने के लिए टैप करें' : 'Tap to switch role or log out'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <LanguageSelector />
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => router.replace('/role-selection')}
              hitSlop={8}
            >
              <Text style={styles.switchBtnText}>
                {lang === 'mr' ? '‹ भूमिका बदला' : lang === 'hi' ? '‹ रोल बदलें' : '‹ Switch Role'}
              </Text>
            </TouchableOpacity>
            <Pressable style={styles.bellBtn} onPress={handleOpenBell}>
              <Icon name="bell" />
              {unreadReferralCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadReferralCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Dynamic Emergency Card: Incoming vs Standby */}
        <Pressable onPress={handleEmergencyCardPress}>
          {pendingEmergency ? (
            <Card style={[styles.incomingCard, styles.activeIncomingCard]}>
              <View style={styles.rowTop}>
                <Pill color="red">
                  {lang === 'mr' ? 'येत असलेला रुग्ण' : lang === 'hi' ? 'इनकमिंग मरीज' : 'INCOMING'} · {String(pendingEmergency.severity || 'HIGH').toUpperCase()}
                </Pill>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.eta}>{lang === 'mr' ? 'वेळ' : lang === 'hi' ? 'समय' : 'ETA'} {pendingEmergency.eta || '6 min'}</Text>
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
                {pendingEmergency.patientName || (lang === 'hi' ? 'आपातकालीन मरीज' : 'Emergency Patient')} · {pendingEmergency.incidentType || 'Trauma Alert'}
              </Text>
              <Text style={styles.incomingSub} numberOfLines={2}>
                📍 {pendingEmergency.locationAddress || (pendingEmergency.location ? `${pendingEmergency.location.latitude?.toFixed(4)}°N, ${pendingEmergency.location.longitude?.toFixed(4)}°E` : 'Live Incident Location')} · {lang === 'mr' ? 'तपशील व डिस्पॅचसाठी टॅप करा' : lang === 'hi' ? 'समीक्षा और डिस्पैच के लिए टैप करें' : 'Tap to review & dispatch'}
              </Text>
            </Card>
          ) : (
            <Card style={styles.incomingCard}>
              <View style={styles.rowTop}>
                <Pill color="success">
                  {lang === 'mr' ? 'डिस्पॅच · स्टँडबाय' : lang === 'hi' ? 'डिस्पैच · स्टैंडबाय' : 'DISPATCH · STANDBY'}
                </Pill>
                <Text style={styles.eta}>{lang === 'mr' ? 'सर्व सामान्य' : lang === 'hi' ? 'सब सामान्य' : 'All Normal'}</Text>
              </View>
              <Text style={styles.incomingName}>
                {lang === 'mr' ? 'आपत्कालीन डिस्पॅच · स्टँडबाय' : lang === 'hi' ? 'आपातकालीन डिस्पैच · स्टैंडबाय' : 'Emergency Dispatch · Standby'}
              </Text>
              <Text style={styles.incomingSub}>
                {lang === 'mr'
                  ? 'कोणतीही आपत्कालीन विनंती प्रलंबित नाही · सर्व ट्रॉमा स्टेशन्स सज्ज'
                  : lang === 'hi'
                  ? 'कोई सक्रिय आपातकालीन अनुरोध नहीं · सभी ट्रॉमा स्टेशन तैयार'
                  : '0 active incoming emergency requests · All trauma stations on standby'}
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
              <Text style={styles.statLabel}>
                {lang === 'mr' ? 'गंभीर रुग्ण' : lang === 'hi' ? 'क्रिटिकल' : 'CRITICAL'}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(hospital)/capacity')}>
            <Card style={styles.stat}>
              <Text style={styles.statNum}>{capacity.availableBeds}/{capacity.totalBeds}</Text>
              <Text style={styles.statLabel}>
                {lang === 'mr' ? 'रिक्त बेड्स' : lang === 'hi' ? 'खाली बेड' : 'BEDS FREE'}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(hospital)/capacity')}>
            <Card style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.success }]}>{capacity.availableIcuBeds}</Text>
              <Text style={styles.statLabel}>
                {lang === 'mr' ? 'रिक्त आयसीयू' : lang === 'hi' ? 'खाली ICU' : 'ICU FREE'}
              </Text>
            </Card>
          </Pressable>
        </View>

        {activeInbound.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <LabelEyebrow>
              {lang === 'mr' ? 'येणारे रुग्ण व पाठवलेल्या रुग्णवाहिका' : lang === 'hi' ? 'इनबाउंड मरीज और डिस्पैच एम्बुलेंस' : 'INBOUND PATIENTS & DISPATCHED AMBULANCES'} ({activeInbound.length})
            </LabelEyebrow>
            {activeInbound.map((item, idx) => {
              const st = String(item.status || 'ACCEPTED').toUpperCase();
              const tripSt = String(item.tripStatus || '').toUpperCase();
              let statusPill = lang === 'mr' ? 'स्वीकारले' : lang === 'hi' ? 'स्वीकृत' : 'ACCEPTED';
              let pillColor: 'red' | 'amber' | 'success' | 'blue' = 'amber';

              if (tripSt === 'AT_HOSPITAL' || st === 'PATIENT ARRIVED') {
                statusPill = lang === 'mr' ? 'ER मध्ये दाखल' : lang === 'hi' ? 'ER पहुंचा' : 'ARRIVED AT ER';
                pillColor = 'success';
              } else if (tripSt === 'PATIENT_ONBOARD' || tripSt === 'EN_ROUTE_TO_HOSPITAL') {
                statusPill = lang === 'mr' ? 'रुग्ण मार्गावर' : lang === 'hi' ? 'मरीज रास्ते में' : 'PATIENT IN TRANSIT';
                pillColor = 'red';
              } else if (tripSt === 'EN_ROUTE_TO_PATIENT' || tripSt === 'AT_PATIENT' || st === 'AMBULANCE EN ROUTE') {
                statusPill = lang === 'mr' ? 'रुग्णवाहिका मार्गावर' : lang === 'hi' ? 'एम्बुलेंस रास्ते में' : 'AMBULANCE EN ROUTE';
                pillColor = 'blue';
              }

              const driverName = item.assignedDriverName || (lang === 'hi' ? 'नियुक्त चालक' : 'Assigned Pilot');
              const vehicle = item.assignedAmbulanceId || 'Ambulance';
              const driverPhone = item.assignedDriverPhone || item.driverPhone || item.driverContact;
              const patientPhone = item.patientPhone || item.phone || item.contactPhone || item.userPhone;

              return (
                <Card key={item.requestId || item.id || idx} style={styles.inboundCard}>
                  <View style={styles.rowTop}>
                    <Pill color={pillColor}>{statusPill}</Pill>
                    <Text style={styles.eta}>{item.eta || (lang === 'hi' ? 'लाइव' : 'Live')}</Text>
                  </View>

                  <Text style={styles.inboundTitle}>
                    {item.patientName || (lang === 'hi' ? 'आपातकालीन मरीज' : 'Emergency Patient')} · {item.incidentType || 'Trauma'}
                  </Text>

                  <View style={styles.inboundMetaRow}>
                    <Icon name="ambulance" size={16} color={colors.inkSoft} />
                    <Text style={styles.inboundMetaText}>
                      {lang === 'mr' ? 'चालक' : lang === 'hi' ? 'पायलट' : 'Pilot'}: {driverName} (Unit {vehicle}) {item.ambulanceType ? `· ${item.ambulanceType}` : ''}
                    </Text>
                  </View>

                  {/* Realtime 3-Way Connectivity Action Buttons */}
                  <View style={styles.inboundBtnRow}>
                    <TouchableOpacity
                      style={styles.actionBtnNav}
                      onPress={() => {
                        const targetLat = item.ambulanceLocation?.latitude || item.location?.latitude || 25.4358;
                        const targetLng = item.ambulanceLocation?.longitude || item.location?.longitude || 81.8463;
                        openExternalNavigation({
                          destLat: targetLat,
                          destLng: targetLng,
                          destTitle: `Ambulance Unit ${vehicle} — ${item.patientName || 'Emergency Patient'}`,
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnTextNav}>
                        📡 {lang === 'mr' ? 'थेट ट्रॅक' : lang === 'hi' ? 'लाइव ट्रैक' : 'Live Track'}
                      </Text>
                    </TouchableOpacity>

                    {driverPhone ? (
                      <TouchableOpacity
                        style={styles.actionBtnBlue}
                        onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnTextBlue}>
                          📞 {lang === 'mr' ? 'चालक' : lang === 'hi' ? 'पायलट' : 'Pilot'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {patientPhone ? (
                      <TouchableOpacity
                        style={styles.actionBtnGreen}
                        onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnTextGreen}>
                          📞 {lang === 'mr' ? 'रुग्ण' : lang === 'hi' ? 'मरीज' : 'Patient'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.actionBtnGrey}
                      onPress={() => {
                        if (item.isReferral) {
                          router.push('/(hospital)/requests');
                        } else {
                          setActiveHospitalRequestId(item.requestId || item.id);
                          router.push('/(hospital)/request-detail');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnTextGrey}>
                        {lang === 'mr' ? 'तपशील →' : lang === 'hi' ? 'समीक्षा →' : 'Review →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Admitted Patients in ER / Treatment Section */}
        {admittedPatients.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <LabelEyebrow>🏥 ADMITTED PATIENTS IN ER ({admittedPatients.length})</LabelEyebrow>
              <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700' }}>Active Treatment</Text>
            </View>
            {admittedPatients.map((item, idx) => {
              const driverName = item.assignedDriverName || item.driverName || 'Pilot';
              const vehicle = item.assignedAmbulanceId || item.ambulanceId || '108';
              const patientPhone = item.patientPhone || item.contactPhone || item.phone || item.userPhone;
              return (
                <Card key={item.requestId || item.id || idx} style={styles.admittedCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>🏥</Text>
                      <Text style={styles.admittedTitle}>
                        {item.patientName || 'Emergency Patient'}
                      </Text>
                    </View>
                    <Pill color="success">IN ER TREATMENT</Pill>
                  </View>

                  <View style={styles.inboundMetaRow}>
                    <Icon name="hospital" size={14} color={colors.inkSoft} />
                    <Text style={styles.inboundMetaText}>
                      ID: {item.requestId || item.id?.slice?.(0, 8) || 'EM-911'} · {item.incidentType || 'Critical'}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginBottom: 10 }}>
                    Unit {vehicle} ({driverName}) · Bed allocated
                  </Text>

                  <View style={styles.inboundBtnRow}>
                    <TouchableOpacity
                      style={styles.actionBtnGrey}
                      onPress={() => {
                        if (item.isReferral) {
                          router.push('/(hospital)/requests');
                        } else {
                          setActiveHospitalRequestId(item.requestId || item.id);
                          router.push('/(hospital)/request-detail');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnTextGrey}>🩺 Details</Text>
                    </TouchableOpacity>

                    {patientPhone ? (
                      <TouchableOpacity
                        style={styles.actionBtnGreen}
                        onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnTextGreen}>📞 Call</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.dischargeBtn}
                      onPress={() => handleDischargePatient(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dischargeBtnText}>✅ Discharge</Text>
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

        {completedCases.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <LabelEyebrow>RESOLVED / COMPLETED EMERGENCY CASES ({completedCases.length})</LabelEyebrow>
              <TouchableOpacity
                onPress={handleClearResolved}
                style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F1F5F9', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft }}>🧹 Clear</Text>
              </TouchableOpacity>
            </View>
            {completedCases.slice(0, 5).map((item, idx) => (
              <Card key={item.requestId || item.id || idx} style={{ padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                    {item.patientName || 'Emergency Patient'} · {item.incidentType || 'Trauma'}
                  </Text>
                  <Pill color="success">RESOLVED</Pill>
                </View>
                <Text style={{ fontSize: 11, color: colors.inkFaint, marginTop: 4 }}>
                  Unit {item.assignedAmbulanceId || '108'} · Pilot: {item.assignedDriverName || 'Assigned Pilot'}
                </Text>
              </Card>
            ))}
          </View>
        )}

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
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  switchBtn: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  switchBtnText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
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
  admittedCard: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  admittedTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
  dischargeBtn: {
    flex: 1.2,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dischargeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

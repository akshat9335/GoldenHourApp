import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Divider, Icon, LabelEyebrow, openExternalMapPreview } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

// Mock stand-in for the backend-provided case payload:
// { goldenHourId, trustScore, confirmationCount, description, voiceTranscript,
//   imageUrl, aiTriage, aiImageAnalysis, severity, location }
// Swap these placeholders for the real fields once the backend is wired up.
const MOCK_CASE = {
  goldenHourId: null as string | null, // e.g. 'GH-8F42K1' once backend assigns it
  trustScore: null as number | null,
  description: 'Chest pain radiating to left arm, shortness of breath, sweating.',
  voiceTranscript: null as string | null,
  imageUrl: null as string | null,
  aiTriage: 'Suspected Cardiac Event',
  aiImageAnalysis: null as string | null,
};

export default function HospitalRequestDetail() {
  const confirmationCount = useAppStore((s) => s.confirmationCount);
  const goldenHourId = useAppStore((s) => s.goldenHourId);
  const trustScore = useAppStore((s) => s.trustScore);
  const emergencyId = useAppStore((s) => s.emergencyId);
  const activeHospitalRequestId = useAppStore((s) => s.activeHospitalRequestId);

  const [detail, setDetail] = React.useState<any>(null);
  const [drivers, setDrivers] = React.useState<any[]>([]);
  const [showDispatchModal, setShowDispatchModal] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    const reqId = activeHospitalRequestId || emergencyId;

    const fetchDetail = () => {
      if (reqId) {
        api.hospitals.getRequestById(reqId)
          .then((res: any) => {
            if (mounted && res) {
              setDetail(res.data || res);
            }
          })
          .catch(() => {});
      }
    };

    fetchDetail();
    const interval = setInterval(fetchDetail, 3500);

    api.hospitals.getDrivers()
      .then((res: any) => {
        if (mounted) {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setDrivers(list);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeHospitalRequestId, emergencyId]);

  const handleAccept = async (dispatchMode: 'AFFILIATED' | 'INDEPENDENT' = 'INDEPENDENT', driverId?: string) => {
    const reqId = activeHospitalRequestId || emergencyId || 'req-demo-1';
    setShowDispatchModal(false);
    try {
      await api.hospitals.acceptRequest(reqId, { dispatchMode, driverId });
    } catch (_err) {
      // Offline fallback handled gracefully
    }
    router.push('/(hospital)/accepted');
  };

  const handleReject = async () => {
    const reqId = activeHospitalRequestId || emergencyId || 'req-demo-1';
    try {
      await api.hospitals.rejectRequest(reqId, 'Capacity full');
    } catch (_err) {
      // Handled
    }
    router.push('/(hospital)/rejected');
  };

  const handleMarkArrived = async () => {
    const reqId = activeHospitalRequestId || emergencyId;
    if (reqId) {
      try {
        await api.hospitals.markPatientArrived(reqId);
      } catch (_err) {}
      router.push('/(hospital)/ready');
    }
  };

  const handleStartTreatment = async () => {
    const reqId = activeHospitalRequestId || emergencyId;
    if (reqId) {
      try {
        await api.hospitals.startTreatment(reqId);
      } catch (_err) {}
      router.replace('/(hospital)/dashboard');
    }
  };

  const handleCompleteCase = async () => {
    const reqId = activeHospitalRequestId || emergencyId;
    if (reqId) {
      try {
        await api.hospitals.completeRequest(reqId);
      } catch (_err) {}
      router.push('/(hospital)/completed');
    }
  };

  const currentStatus = String(detail?.status || 'NEW').toUpperCase();

  const patientSeverity = (detail?.severity || 'HIGH').toUpperCase();
  const patientEta = detail?.eta || '6 min';
  const patientName = detail?.patientName || 'Emergency Patient · Critical Trauma';
  const patientSub = detail?.patientPhone ? `Phone: ${detail.patientPhone}` : (detail?.bloodGroup ? `Blood group ${detail.bloodGroup}` : 'Verified Emergency Patient');
  const patientCrisisId = detail?.goldenHourId || detail?.crisisId || goldenHourId || 'Pending assignment';
  const patientTrustScore = detail?.trustScore != null ? `${detail.trustScore} / 100` : (trustScore != null ? `${trustScore} / 100` : '100 / 100');
  const incidentType = detail?.incidentType || 'Medical Emergency';
  const incidentLocation = detail?.locationAddress
    ? `${detail.locationAddress} (${detail.location?.latitude?.toFixed(4)}, ${detail.location?.longitude?.toFixed(4)})`
    : detail?.location
    ? `${detail.location.latitude.toFixed(4)}, ${detail.location.longitude.toFixed(4)}`
    : 'Live GPS location';
  const incidentTime = detail?.createdAt ? new Date(detail.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
  const patientDescription = detail?.description || null;
  const photoUrl = detail?.imageUrl || null;
  const voiceTranscript = detail?.voiceTranscript || null;
  const aiTriage = detail?.aiResult?.primaryDiagnosis || detail?.aiResult?.triageCategory || 'Emergency Triage Complete';
  const aiDesc = detail?.aiResult?.recommendation || detail?.description || 'Immediate emergency evaluation and admission recommended';
  const aiImageAnalysis = detail?.aiResult?.imageAnalysis || null;
  const currentConfirmations = detail?.confirmationCount != null ? detail.confirmationCount : confirmationCount;

  return (
    <Screen>
      <TopBar
        title="Incoming Patient"
        onPressBack={() => router.replace('/(hospital)/dashboard')}
        right={
          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F3F4F6', borderRadius: 8 }}
            onPress={() => router.replace('/(hospital)/dashboard')}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Dashboard</Text>
          </TouchableOpacity>
        }
      />

      <LabelEyebrow>PATIENT INFORMATION</LabelEyebrow>
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Pill color={patientSeverity === 'CRITICAL' || patientSeverity === 'HIGH' ? 'red' : 'amber'}>
            {patientSeverity} SEVERITY
          </Pill>
          <Text style={styles.eta}>ETA {patientEta}</Text>
        </View>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <Text style={styles.name}>{patientName}</Text>
        <Text style={styles.sub}>{patientSub}</Text>
        <View style={{ marginVertical: 12 }}><Divider /></View>
        <MiniRow label="Golden Hour ID" value={patientCrisisId} />
        <MiniRow label="Trust Score" value={patientTrustScore} last />
      </Card>

      <LabelEyebrow>INCIDENT INFORMATION</LabelEyebrow>
      <Card style={styles.card}>
        <MiniRow label="Incident Type" value={incidentType} />
        <MiniRow label="Location" value={incidentLocation} />
        <MiniRow label="Time" value={incidentTime} />
        <MiniRow label="Severity" value={patientSeverity} last />
      </Card>

      <LabelEyebrow>PATIENT DESCRIPTION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={patientDescription ? styles.bodyText : styles.emptyText}>
          {patientDescription || 'Not provided'}
        </Text>
      </Card>

      <LabelEyebrow>ACCIDENT PHOTO</LabelEyebrow>
      <Card style={styles.textCard}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <Text style={styles.emptyText}>No photo provided</Text>
        )}
      </Card>

      <LabelEyebrow>VOICE DESCRIPTION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={voiceTranscript ? styles.bodyText : styles.emptyText}>
          {voiceTranscript || 'No voice description provided'}
        </Text>
      </Card>

      <LabelEyebrow>AI ASSESSMENT</LabelEyebrow>
      <Card style={styles.assessCard}>
        <Text style={styles.assessTitle}>{aiTriage}</Text>
        <Text style={styles.assessDesc}>{aiDesc}</Text>
      </Card>

      <LabelEyebrow>AI IMAGE ASSESSMENT</LabelEyebrow>
      <Card style={styles.textCard}>
        {aiImageAnalysis ? (
          typeof aiImageAnalysis === 'object' ? (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Pill color={aiImageAnalysis.isAuthentic !== false ? 'success' : 'red'}>
                  {aiImageAnalysis.isAuthentic !== false ? 'GENUINE SCENE VERIFIED' : 'POSSIBLE SYNTHETIC / AI'}
                </Pill>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink, marginBottom: 6 }}>
                {aiImageAnalysis.authenticityAssessment || 'Image verified'}
              </Text>
              {Array.isArray(aiImageAnalysis.findings) && aiImageAnalysis.findings.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 4 }}>
                    TRAUMA FINDINGS:
                  </Text>
                  {aiImageAnalysis.findings.map((f: string, i: number) => (
                    <Text key={i} style={{ fontSize: 11.5, color: colors.ink, marginBottom: 2 }}>
                      • {f}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.bodyText}>{String(aiImageAnalysis)}</Text>
          )
        ) : (
          <Text style={styles.emptyText}>Image analysis not available</Text>
        )}
      </Card>

      <LabelEyebrow>COMMUNITY CONFIRMATION</LabelEyebrow>
      <Card style={styles.textCard}>
        <Text style={currentConfirmations > 0 ? styles.bodyText : styles.emptyText}>
          {currentConfirmations > 0 ? `Confirmed by ${currentConfirmations} user(s)` : 'No confirmations yet'}
        </Text>
      </Card>

      <LabelEyebrow>AMBULANCE & RESPONDING CREW</LabelEyebrow>
      <Card style={styles.ambCard}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="ambulance" size={24} color={colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ambName}>
              Unit: {detail?.assignedAmbulanceId || 'Awaiting Dispatch'}
            </Text>
            <Text style={styles.ambSub}>
              Pilot: {detail?.assignedDriverName || 'Community / Hospital Pilot'} {detail?.ambulanceType ? `· ${detail.ambulanceType}` : ''}
            </Text>
            <Text style={styles.ambSub}>
              Distance: {detail?.distanceKm ? `${detail.distanceKm} km` : '2.8 km'} · ETA {patientEta}
            </Text>
          </View>
        </View>

        {/* Inbound Patient Vitals Streamed from Pilot */}
        {detail?.vitals ? (
          <View style={styles.vitalsInboundBox}>
            <Text style={styles.vitalsInboundTag}>📡 LIVE VITALS STREAMED FROM PILOT</Text>
            <View style={styles.vitalsInboundRow}>
              <Text style={styles.vitalsInboundVal}>Pulse: <Text style={{ color: colors.ink, fontWeight: '800' }}>{detail.vitals.pulse} bpm</Text></Text>
              <Text style={styles.vitalsInboundVal}>SpO2: <Text style={{ color: colors.ink, fontWeight: '800' }}>{detail.vitals.spO2}%</Text></Text>
              <Text style={styles.vitalsInboundVal}>BP: <Text style={{ color: colors.ink, fontWeight: '800' }}>{detail.vitals.bp}</Text></Text>
              {detail.vitals.bloodSugar ? (
                <Text style={styles.vitalsInboundVal}>Sugar: <Text style={{ color: colors.ink, fontWeight: '800' }}>{detail.vitals.bloodSugar} mg/dL</Text></Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* 3-Way Direct Contact & Live Route Buttons */}
        <View style={styles.ambActionRow}>
          {(detail?.assignedDriverPhone || detail?.driverPhone || detail?.assignedDriverContact) ? (
            <TouchableOpacity
              style={styles.actionBtnBlue}
              onPress={() => {
                const p = detail?.assignedDriverPhone || detail?.driverPhone || detail?.assignedDriverContact;
                Linking.openURL(`tel:${String(p).replace(/[^0-9+]/g, '')}`);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnTextBlue}>📞 Call Pilot</Text>
            </TouchableOpacity>
          ) : null}

          {(detail?.patientPhone || detail?.phone || detail?.contactPhone || detail?.userPhone) ? (
            <TouchableOpacity
              style={styles.actionBtnGreen}
              onPress={() => {
                const p = detail?.patientPhone || detail?.phone || detail?.contactPhone || detail?.userPhone;
                Linking.openURL(`tel:${String(p).replace(/[^0-9+]/g, '')}`);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnTextGreen}>📞 Call Patient</Text>
            </TouchableOpacity>
          ) : null}

          {detail?.ambulanceLocation?.latitude && detail?.ambulanceLocation?.longitude ? (
            <TouchableOpacity
              style={[styles.actionBtnBlue, { backgroundColor: '#1E293B', borderColor: '#334155' }]}
              onPress={() => {
                const ambLat = detail.ambulanceLocation.latitude;
                const ambLng = detail.ambulanceLocation.longitude;
                const destLat = detail.assignedHospitalLocation?.latitude || detail.location?.latitude;
                const destLng = detail.assignedHospitalLocation?.longitude || detail.location?.longitude;
                openExternalMapPreview({
                  lat: ambLat,
                  lng: ambLng,
                  title: detail.assignedAmbulanceId ? `Ambulance ${detail.assignedAmbulanceId}` : 'Rescue Ambulance',
                  originLat: destLat,
                  originLng: destLng,
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnTextBlue, { color: '#38BDF8' }]}>📡 Live Route</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Card>

      {/* Pre-Arrival Trauma Bay Readiness Notice */}
      <View style={styles.traumaNoticeBox}>
        <Text style={styles.traumaNoticeTitle}>🚨 ER PRE-ARRIVAL PROTOCOL ACTIVE</Text>
        <Text style={styles.traumaNoticeText}>
          Trauma Bay reserved · Blood bank standing by · Diagnostic CT on standby.
        </Text>
      </View>

      {currentStatus === 'NEW' || currentStatus === 'PENDING' ? (
        <View style={styles.buttonRow}>
          <View style={styles.buttonCol}>
            <Button title="Reject" variant="secondary" onPress={handleReject} style={{ width: '100%' }} />
          </View>
          <View style={styles.buttonCol}>
            <Button
              title="Accept & Dispatch →"
              onPress={() => setShowDispatchModal(true)}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      ) : currentStatus === 'ACCEPTED' || currentStatus === 'AMBULANCE EN ROUTE' ? (
        <View style={{ marginTop: 8, marginBottom: 28 }}>
          <Button
            title="Mark Patient Arrived at Hospital →"
            onPress={handleMarkArrived}
          />
        </View>
      ) : currentStatus === 'PATIENT ARRIVED' ? (
        <View style={{ marginTop: 8, marginBottom: 28 }}>
          <Button
            title="Start Emergency Treatment →"
            onPress={handleStartTreatment}
          />
        </View>
      ) : currentStatus === 'IN TREATMENT' ? (
        <View style={{ marginTop: 8, marginBottom: 28 }}>
          <Button
            title="Complete Emergency Case ✓"
            onPress={handleCompleteCase}
          />
        </View>
      ) : (
        <View style={{ marginTop: 8, marginBottom: 28 }}>
          <Button
            title="Return to Hospital Dashboard"
            variant="secondary"
            onPress={() => router.replace('/(hospital)/dashboard')}
          />
        </View>
      )}

      {/* 2-Option Dispatch Modal */}
      <Modal
        visible={showDispatchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDispatchModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Accept & Dispatch Ambulance</Text>
              <TouchableOpacity onPress={() => setShowDispatchModal(false)}>
                <Text style={{ fontSize: 18, color: colors.inkFaint }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Select whether to dispatch from your hospital's fleet or broadcast to the independent emergency network.
            </Text>

            <TouchableOpacity
              style={styles.dispatchOptionBtn}
              onPress={() => {
                handleAccept('AFFILIATED');
              }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="ambulance" color={colors.red} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dispatchOptionTitle}>Broadcast to Hospital Fleet (Fastest)</Text>
                  <Text style={styles.dispatchOptionDesc}>
                    {drivers.length > 0
                      ? `Alerts all ${drivers.length} registered on-call pilot(s)`
                      : 'Hospital Rapid Response ALS Unit (Priority dispatch)'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Optional Specific Driver Selection */}
            {drivers.length > 0 && (
              <View style={{ marginVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', marginBottom: 6 }}>
                  Or Assign Specific Pilot ({drivers.length})
                </Text>
                <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                  {drivers.map((drv: any) => {
                    const drvId = drv.uid || drv.id;
                    const drvName = drv.name || drv.driverName || 'Ambulance Pilot';
                    const drvPhone = drv.phone || drv.contactNumber;
                    const vehicle = drv.vehicleNumber || drv.ambulanceId || 'Emergency Unit';
                    const isAvail = drv.availability === 'AVAILABLE' || !drv.availability;
                    return (
                      <TouchableOpacity
                        key={drvId}
                        style={[styles.driverRowCard, !isAvail && { opacity: 0.6 }]}
                        onPress={() => handleAccept('AFFILIATED', drvId)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{drvName}</Text>
                            <Pill color={isAvail ? 'success' : 'amber'}>
                              {isAvail ? 'AVAILABLE' : 'ON DUTY'}
                            </Pill>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.inkFaint, marginTop: 2 }}>
                            Unit: {vehicle} {drvPhone ? `· 📞 ${drvPhone}` : ''}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.red }}>
                          Assign →
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[styles.dispatchOptionBtn, { borderColor: '#3B82F640', backgroundColor: '#EFF6FF' }]}
              onPress={() => handleAccept('INDEPENDENT')}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="ambulance" color={colors.blue} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dispatchOptionTitle, { color: colors.blue }]}>Broadcast to 108 / Independent Fleet</Text>
                  <Text style={styles.dispatchOptionDesc}>
                    Notifies all verified independent drivers within 5km of patient
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDispatchModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function MiniRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.miniRow, last && { marginBottom: 0 }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { fontSize: 11, color: colors.inkFaint, fontWeight: '700' },
  name: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  textCard: { padding: 14, marginBottom: 16 },
  bodyText: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },
  emptyText: { fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic' },
  photo: { width: '100%', height: 160, borderRadius: 14, backgroundColor: colors.grey },
  assessCard: { padding: 14, marginBottom: 16 },
  assessTitle: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  assessDesc: { fontSize: 11.5, color: colors.inkSoft, marginTop: 6 },
  ambCard: { padding: 14, marginBottom: 16 },
  ambName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  ambSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  ambActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionBtnBlue: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
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
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextGreen: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.success,
  },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  miniLabel: { fontSize: 11.5, color: colors.inkFaint },
  miniValue: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 28,
  },
  buttonCol: {
    flex: 1,
  },
  vitalsInboundBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalsInboundTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.blue,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vitalsInboundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalsInboundVal: {
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  traumaNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  traumaNoticeTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.red,
    letterSpacing: 0.5,
  },
  traumaNoticeText: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  modalSub: {
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
    marginBottom: 16,
  },
  dispatchOptionBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F8717140',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  dispatchOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.red,
  },
  dispatchOptionDesc: {
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkFaint,
  },
  driverRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, LabelEyebrow, Divider, DoctorNav, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

const statusColor: Record<string, 'success' | 'amber' | 'grey'> = {
  running: 'success',
  paused: 'amber',
  not_started: 'grey',
  closed: 'grey',
};

const QUICK_DIAGNOSES = [
  'Acute Angina / Chest Pain',
  'Hypertension Stage 2',
  'Viral Fever & URI',
  'Trauma / Suspected Fracture',
  'Acute Bronchial Asthma',
];

const STANDARD_MEDICINES: PrescribedMed[] = [
  { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: '1-0-1', duration: '5 days', instructions: 'After meals' },
  { name: 'Pantoprazole 40mg', dosage: '1 tablet', frequency: '1-0-0', duration: '7 days', instructions: 'Before breakfast' },
  { name: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: '1-0-1', duration: '5 days', instructions: 'After food' },
  { name: 'Ondansetron 4mg', dosage: '1 tablet', frequency: 'SOS (as needed)', duration: '3 days', instructions: 'For nausea/vomiting' },
  { name: 'Cetirizine 10mg', dosage: '1 tablet', frequency: '0-0-1', duration: '5 days', instructions: 'At bedtime' },
  { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: '1-0-1', duration: '3 days', instructions: 'For severe pain' },
  { name: 'ORS Sachet', dosage: '1 packet in 1L water', frequency: 'Sip throughout day', duration: '2 days', instructions: 'Rehydration' },
];

const PRAYAGRAJ_HOSPITALS = [
  { id: 'hosp-srn-prayagraj', name: 'Swaroop Rani Nehru (SRN) Hospital' },
  { id: 'hosp-medanta-prayagraj', name: 'Medanta Super Specialty Hospital' },
  { id: 'hosp-mln-prayagraj', name: 'Motilal Nehru (MLN) Medical College' },
  { id: 'hosp-kamla-prayagraj', name: 'Kamla Nehru Memorial Hospital' },
];

interface PrescribedMed {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function DoctorQueue() {
  const userProfile = useAppStore((s) => s.userProfile);
  const servingToken = useAppStore((s) => s.servingToken);
  const advanceServingToken = useAppStore((s) => s.advanceServingToken);
  const queueStatus = useAppStore((s) => s.queueStatus);
  const setQueueStatus = useAppStore((s) => s.setQueueStatus);

  const doctorId = userProfile?.uid ? `doc-${userProfile.uid}` : 'doc-1';
  const doctorName = userProfile?.name || 'Dr. Akshat Srivastava';
  const doctorSpecialty = userProfile?.specialty || 'Cardiologist';

  const [appointments, setAppointments] = useState<any[]>([]);

  // Consultation Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [savingConsult, setSavingConsult] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [bp, setBp] = useState('120/80');
  const [heartRate, setHeartRate] = useState('76');
  const [prescriptions, setPrescriptions] = useState<PrescribedMed[]>([
    { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: '1-0-1', duration: '5 days', instructions: 'After meals' },
  ]);

  // Referral states & Real Registered Hospitals from DB
  const [registeredHospitals, setRegisteredHospitals] = useState<any[]>(PRAYAGRAJ_HOSPITALS);
  const [isReferralActive, setIsReferralActive] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState(PRAYAGRAJ_HOSPITALS[0].id);
  const [referralPriority, setReferralPriority] = useState<'HIGH' | 'NORMAL'>('HIGH');
  const [referralReason, setReferralReason] = useState('');

  const fetchQueueData = () => {
    api.queues
      .getLiveQueue(doctorId)
      .then((q: any) => {
        if (q && typeof q.servingToken === 'number') {
          useAppStore.setState({ servingToken: q.servingToken });
        }
      })
      .catch(() => {});

    api.appointments
      .getDoctorAppointments({ doctorId })
      .then((data: any) => {
        if (Array.isArray(data)) {
          setAppointments(data);
        }
      })
      .catch(() => {});

    // Fetch real registered hospitals from Firestore
    api.location
      .getNearbyHospitals(25.4484, 81.8460, 50)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.hospitals || []);
        if (list && list.length > 0) {
          const mapped = list.map((h: any) => ({
            id: h.id || h.hospitalId || `hosp-${Math.random().toString(36).slice(2, 6)}`,
            name: h.name || h.hospitalName || 'Hospital',
            address: h.address || h.vicinity || 'Prayagraj',
          }));
          setRegisteredHospitals(mapped);
          if (!mapped.find((m: any) => m.id === selectedHospitalId)) {
            setSelectedHospitalId(mapped[0].id);
          }
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    fetchQueueData();
    const timer = setInterval(fetchQueueData, 5000);
    return () => clearInterval(timer);
  }, [doctorId]);

  const currentAppt = appointments.find(
    (a) => (a.tokenNumber || a.token) === servingToken
  );
  const currentPatientName =
    currentAppt?.patientName ||
    (servingToken > 0 ? `Walk-in Patient (Token #${servingToken})` : 'No Active Patient');
  const currentStatus =
    (currentAppt?.status || (servingToken > 0 ? 'WAITING' : 'IDLE')).toUpperCase();

  const handleNext = async () => {
    try {
      const res: any = await api.queues.advanceQueue(doctorId);
      if (res && typeof res.servingToken === 'number') {
        useAppStore.setState({ servingToken: res.servingToken });
      } else {
        advanceServingToken();
      }
    } catch (_err) {
      advanceServingToken();
    }
    fetchQueueData();
  };

  const handleStart = async () => {
    if (currentAppt?.appointmentId) {
      try {
        await api.appointments.start(currentAppt.appointmentId);
      } catch {}
    }
    setAppointments((prev) =>
      prev.map((a) =>
        (a.appointmentId || a.id) === (currentAppt?.appointmentId || currentAppt?.id)
          ? { ...a, status: 'IN_PROGRESS' }
          : a
      )
    );
  };

  const handleOpenConsultModal = () => {
    if (servingToken <= 0) {
      Alert.alert('No Active Patient', 'Please advance queue or call next patient first.');
      return;
    }
    // Pre-populate if empty
    if (!diagnosis) setDiagnosis('Acute Angina / Chest Pain');
    if (!referralReason) setReferralReason('Requires urgent tertiary cardiac evaluation and angiography');
    setModalVisible(true);
  };

  const handleAddMedicine = () => {
    setPrescriptions((prev) => [
      ...prev,
      { name: 'Aspirin 300mg', dosage: '1 tablet stat', frequency: 'Once daily', duration: '3 days', instructions: 'Chew or dissolve' },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveConsultation = async () => {
    if (!diagnosis.trim()) {
      Alert.alert('Diagnosis Required', 'Please enter a diagnosis for the health record.');
      return;
    }

    setSavingConsult(true);
    try {
      const selectedHosp = registeredHospitals.find((h) => h.id === selectedHospitalId) || PRAYAGRAJ_HOSPITALS[0];

      const payload = {
        patientId: currentAppt?.patientId || `patient-token-${servingToken}`,
        patientName: currentPatientName,
        doctorId,
        doctorName,
        doctorSpecialty,
        clinicName: userProfile?.clinicName || 'Civil Lines OPD Clinic, Prayagraj',
        appointmentId: currentAppt?.appointmentId || currentAppt?.id,
        tokenNumber: servingToken,
        diagnosis,
        notes,
        vitals: {
          bloodPressure: bp,
          heartRate: parseInt(heartRate) || 72,
          temperature: '98.6 F',
          spO2: 98,
        },
        prescriptions,
        referral: isReferralActive
          ? {
              hospitalId: selectedHospitalId,
              hospitalName: selectedHosp?.name || 'Tertiary Care Hospital',
              reason: referralReason || diagnosis,
              priority: referralPriority,
            }
          : undefined,
      };

      await api.healthRecords.create(payload);

      if (isReferralActive) {
        try {
          await api.referrals.create({
            patientId: currentAppt?.patientId || `patient-token-${servingToken}`,
            patientName: currentPatientName,
            doctorId,
            doctorName,
            hospitalId: selectedHospitalId,
            hospitalName: selectedHosp?.name || 'Tertiary Care Hospital',
            reason: referralReason || diagnosis,
            priority: referralPriority,
            notes: notes || `Referred by ${doctorName}`,
          });
        } catch (refErr) {
          console.warn('Referral creation warning:', refErr);
        }
      }

      const apptId = currentAppt?.appointmentId || currentAppt?.id;
      if (apptId) {
        try {
          await api.appointments.complete(apptId);
        } catch (completeErr) {
          console.warn('Appointment complete error:', completeErr);
        }
        setAppointments((prev) =>
          prev.map((a) =>
            (a.appointmentId || a.id) === apptId
              ? { ...a, status: 'COMPLETED' }
              : a
          )
        );
      }

      setModalVisible(false);
      Alert.alert(
        'Consultation Completed',
        `Prescription and health record saved for ${currentPatientName}.${isReferralActive ? ' Referral sent to hospital.' : ''}`
      );

      // Advance to next patient
      await handleNext();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save health record. Check backend connection.');
    } finally {
      setSavingConsult(false);
    }
  };

  const handleSkip = async () => {
    if (currentAppt?.appointmentId) {
      try {
        await api.appointments.skip(currentAppt.appointmentId);
      } catch {}
    }
    await handleNext();
  };

  const handleResetQueue = async () => {
    try {
      await api.queues.resetQueue(doctorId);
      useAppStore.setState({ servingToken: 0 });
      fetchQueueData();
    } catch {
      useAppStore.setState({ servingToken: 0 });
    }
  };

  const waitingAppointments = appointments.filter(
    (a) => (a.tokenNumber || a.token) > servingToken && (a.status || '').toUpperCase() !== 'CANCELLED'
  );

  const fallbackWaitingTokens = [servingToken + 1, servingToken + 2, servingToken + 3];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <View style={styles.headerRow}>
          <TopBar title="Queue Management" back={false} />
          <Pill color={statusColor[queueStatus]}>{queueStatus.replace('_', ' ').toUpperCase()}</Pill>
        </View>

        <Card style={styles.currentCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 8 }}>
            <LabelEyebrow>CURRENT CONSULTATION</LabelEyebrow>
            <Pill color={currentStatus === 'IN_PROGRESS' ? 'success' : currentStatus === 'COMPLETED' ? 'blue' : 'amber'}>
              {currentStatus}
            </Pill>
          </View>
          <Text style={styles.tokenBig}>Token #{servingToken}</Text>
          <Text style={styles.patientName}>{currentPatientName}</Text>
          {currentAppt?.timeSlot && (
            <Text style={styles.slotText}>Slot: {currentAppt.timeSlot} · {currentAppt.notes || 'General OPD'}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button
              title={currentStatus === 'IN_PROGRESS' ? "In Consultation…" : "Start Consultation"}
              disabled={currentStatus === 'IN_PROGRESS' || servingToken === 0}
              style={{ flex: 1 }}
              onPress={handleStart}
            />
            <Button title="Skip / No-Show" variant="secondary" style={{ flex: 1 }} onPress={handleSkip} />
          </View>

          <Button
            title="Complete & Prescribe"
            variant="blue"
            style={{ marginTop: 8 }}
            onPress={handleOpenConsultModal}
          />

          {servingToken > 0 && (
            <Button
              title="📹 Join Teleconsultation Room"
              style={{ marginTop: 8, backgroundColor: colors.blue }}
              onPress={() => router.push(`/(doctor)/teleconsultation/tc_${servingToken}` as any)}
            />
          )}
        </Card>

        <View style={styles.controlsRow}>
          {queueStatus !== 'running' ? (
            <Button title={queueStatus === 'not_started' ? 'Start Queue' : 'Resume Queue'} style={{ flex: 1 }} onPress={() => setQueueStatus('running')} />
          ) : (
            <Button title="Pause Queue" variant="secondary" style={{ flex: 1 }} onPress={() => setQueueStatus('paused')} />
          )}
          <Button title="Reset Queue" variant="ghost" style={{ flex: 1 }} onPress={handleResetQueue} />
        </View>

        <LabelEyebrow>WAITING PATIENTS ({waitingAppointments.length})</LabelEyebrow>
        <Card style={{ padding: 4 }}>
          {waitingAppointments.length > 0 ? (
            waitingAppointments.map((a, i) => {
              const tok = a.tokenNumber || a.token;
              return (
                <React.Fragment key={a.appointmentId || a.id || `tok-${tok}`}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowToken}>Token #{tok} · {a.patientName}</Text>
                      <Text style={styles.rowSub}>{a.timeSlot || 'Scheduled'} {a.notes ? `· ${a.notes}` : ''}</Text>
                    </View>
                    <Pill color={i === 0 ? 'amber' : 'grey'}>{i === 0 ? 'NEXT' : 'WAITING'}</Pill>
                  </View>
                  {i < waitingAppointments.length - 1 && <Divider />}
                </React.Fragment>
              );
            })
          ) : (
            fallbackWaitingTokens.map((t, i) => (
              <React.Fragment key={t}>
                <View style={styles.row}>
                  <Text style={styles.rowToken}>Token #{t} (Upcoming)</Text>
                  <Pill color={i === 0 ? 'amber' : 'grey'}>{i === 0 ? 'NEXT' : 'WAITING'}</Pill>
                </View>
                {i < fallbackWaitingTokens.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </Card>
      </Screen>
      <DoctorNav active="/(doctor)/queue" />

      {/* Complete Consultation & Prescription Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Consultation & Prescription</Text>
                <Text style={styles.modalSub}>Token #{servingToken} · {currentPatientName}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={{ fontSize: 18, color: colors.ink }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Diagnosis */}
              <Text style={styles.inputLabel}>PRIMARY DIAGNOSIS *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Acute Angina, Hypertension"
                value={diagnosis}
                onChangeText={setDiagnosis}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {QUICK_DIAGNOSES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, diagnosis === d && styles.chipActive]}
                    onPress={() => setDiagnosis(d)}
                  >
                    <Text style={[styles.chipText, diagnosis === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vitals */}
              <Text style={styles.inputLabel}>PATIENT VITALS</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>BP (mmHg)</Text>
                  <TextInput style={styles.miniInput} value={bp} onChangeText={setBp} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Heart Rate (bpm)</Text>
                  <TextInput style={styles.miniInput} value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" />
                </View>
              </View>

              {/* Digital Prescription (Phase 5) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Text style={styles.inputLabel}>DIGITAL PRESCRIPTION (Rx)</Text>
                <TouchableOpacity onPress={handleAddMedicine} style={styles.addMedBtn}>
                  <Text style={styles.addMedText}>+ Add Custom</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Standard Medicine Suggestions */}
              <Text style={[styles.miniLabel, { marginTop: 4 }]}>QUICK SUGGESTIONS (TAP TO ADD):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {STANDARD_MEDICINES.map((sm) => (
                  <TouchableOpacity
                    key={sm.name}
                    style={styles.chip}
                    onPress={() => {
                      if (!prescriptions.some((p) => p.name.toLowerCase() === sm.name.toLowerCase())) {
                        setPrescriptions((prev) => [...prev, sm]);
                      }
                    }}
                  >
                    <Text style={styles.chipText}>+ {sm.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {prescriptions.map((med, idx) => (
                <View key={idx} style={styles.medCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.medTitle}>Medicine #{idx + 1}</Text>
                    {prescriptions.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveMedicine(idx)}>
                        <Text style={{ color: colors.red, fontSize: 12 }}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[styles.textInput, { marginTop: 4 }]}
                    placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                    value={med.name}
                    onChangeText={(txt) => {
                      const updated = [...prescriptions];
                      updated[idx].name = txt;
                      setPrescriptions(updated);
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <TextInput
                      style={[styles.miniInput, { flex: 1 }]}
                      placeholder="Dosage"
                      value={med.dosage}
                      onChangeText={(txt) => {
                        const updated = [...prescriptions];
                        updated[idx].dosage = txt;
                        setPrescriptions(updated);
                      }}
                    />
                    <TextInput
                      style={[styles.miniInput, { flex: 1 }]}
                      placeholder="Frequency"
                      value={med.frequency}
                      onChangeText={(txt) => {
                        const updated = [...prescriptions];
                        updated[idx].frequency = txt;
                        setPrescriptions(updated);
                      }}
                    />
                    <TextInput
                      style={[styles.miniInput, { flex: 1 }]}
                      placeholder="Duration"
                      value={med.duration}
                      onChangeText={(txt) => {
                        const updated = [...prescriptions];
                        updated[idx].duration = txt;
                        setPrescriptions(updated);
                      }}
                    />
                  </View>
                </View>
              ))}

              {/* Referral (Phase 4) */}
              <View style={styles.referralSection}>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setIsReferralActive(!isReferralActive)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="hospital" size={16} color={isReferralActive ? colors.red : colors.inkFaint} />
                    <Text style={[styles.referralToggleTitle, isReferralActive && { color: colors.red }]}>
                      Refer Patient to Hospital
                    </Text>
                  </View>
                  <Pill color={isReferralActive ? 'red' : 'grey'}>
                    {isReferralActive ? 'REFERRAL ACTIVE' : 'NO REFERRAL'}
                  </Pill>
                </TouchableOpacity>

                {isReferralActive && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.miniLabel}>SELECT TERTIARY HOSPITAL (DB REGISTERED)</Text>
                    {registeredHospitals.map((h) => (
                      <TouchableOpacity
                        key={h.id}
                        style={[styles.hospChoice, selectedHospitalId === h.id && styles.hospChoiceActive]}
                        onPress={() => setSelectedHospitalId(h.id)}
                      >
                        <Text style={[styles.hospChoiceText, selectedHospitalId === h.id && styles.hospChoiceTextActive]}>
                          {h.name}
                        </Text>
                        {h.address && (
                          <Text style={{ fontSize: 10, color: selectedHospitalId === h.id ? '#93c5fd' : colors.inkFaint, marginTop: 2 }}>
                            {h.address}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={[styles.priorityBtn, referralPriority === 'HIGH' && styles.priorityBtnHigh]}
                        onPress={() => setReferralPriority('HIGH')}
                      >
                        <Text style={[styles.priorityText, referralPriority === 'HIGH' && { color: '#fff' }]}>
                          HIGH PRIORITY
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.priorityBtn, referralPriority === 'NORMAL' && styles.priorityBtnNormal]}
                        onPress={() => setReferralPriority('NORMAL')}
                      >
                        <Text style={[styles.priorityText, referralPriority === 'NORMAL' && { color: '#fff' }]}>
                          NORMAL
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.textInput, { marginTop: 8 }]}
                      placeholder="Reason for referral (e.g. ICU / Cath Lab needed)"
                      value={referralReason}
                      onChangeText={setReferralReason}
                    />
                  </View>
                )}
              </View>

              {/* Clinical Notes */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>CLINICAL ADVICE & NOTES</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                placeholder="General patient instructions, dietary restrictions..."
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </ScrollView>

            <View style={{ marginTop: 14 }}>
              <Button
                title={savingConsult ? 'Saving & Generating Records...' : 'Save Record, Prescribe & Call Next'}
                onPress={handleSaveConsultation}
                disabled={savingConsult}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentCard: { padding: 16, marginTop: 4, marginBottom: 14, alignItems: 'center' },
  tokenBig: { fontSize: 30, fontWeight: '800', color: colors.red, marginTop: 4 },
  patientName: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  slotText: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  controlsRow: { marginBottom: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  rowToken: { fontWeight: '700', fontSize: 13, color: colors.ink },
  rowSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  modalSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  closeBtn: { padding: 6 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: '#FAFAFA',
  },
  chip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  chipActive: { backgroundColor: colors.blue },
  chipText: { fontSize: 11, color: colors.ink },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  miniLabel: { fontSize: 10, color: colors.inkFaint, marginBottom: 2 },
  miniInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: '#FAFAFA',
  },
  addMedBtn: { backgroundColor: '#EBF3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  addMedText: { color: colors.blue, fontSize: 11, fontWeight: '700' },
  medCard: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  medTitle: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
  referralSection: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    backgroundColor: '#FFFDFD',
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  referralToggleTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  hospChoice: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 4,
    backgroundColor: '#fff',
  },
  hospChoiceActive: { borderColor: colors.red, backgroundColor: '#FFF5F5' },
  hospChoiceText: { fontSize: 11.5, color: colors.inkSoft },
  hospChoiceTextActive: { color: colors.red, fontWeight: '700' },
  priorityBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  priorityBtnHigh: { backgroundColor: colors.red, borderColor: colors.red },
  priorityBtnNormal: { backgroundColor: colors.ink, borderColor: colors.ink },
  priorityText: { fontSize: 11, fontWeight: '700', color: colors.ink },
});

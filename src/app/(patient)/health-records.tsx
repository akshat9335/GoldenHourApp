import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, PatientNav, Icon, Button, Divider } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

export default function PatientHealthRecords() {
  const userProfile = useAppStore((s) => s.userProfile);
  const patientId = userProfile?.uid || (userProfile as any)?.id || 'patient-1';

  const [records, setRecords] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // FHIR R4 Modal
  const [fhirModalVisible, setFhirModalVisible] = useState(false);
  const [fhirBundle, setFhirBundle] = useState<any>(null);
  const [loadingFhir, setLoadingFhir] = useState(false);

  // Medicine Stock Modal (Phase 6)
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [selectedMedName, setSelectedMedName] = useState('');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const fetchHealthData = useCallback(async () => {
    try {
      const recsRes: any = await api.healthRecords.getPatientRecords(patientId);
      const recs = Array.isArray(recsRes) ? recsRes : (recsRes?.data || []);
      setRecords(recs);

      const refsRes: any = await api.referrals.getPatientReferrals(patientId);
      const refs = Array.isArray(refsRes) ? refsRes : (refsRes?.data || []);
      setReferrals(refs);
    } catch (_err) {
      // Fallback empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHealthData();
  };

  const handleOpenFhirModal = async () => {
    setLoadingFhir(true);
    setFhirModalVisible(true);
    try {
      const res: any = await api.healthRecords.getFHIRBundle(patientId);
      setFhirBundle(res?.data || res);
    } catch (_err) {
      setFhirBundle({ error: 'Failed to retrieve FHIR R4 bundle' });
    } finally {
      setLoadingFhir(false);
    }
  };

  const handleCheckMedicineStock = async (medName: string) => {
    setSelectedMedName(medName);
    setLoadingStock(true);
    setStockModalVisible(true);
    try {
      const simpleName = medName.split(' ')[0]; // e.g. "Paracetamol" or "Aspirin"
      const res: any = await api.medicines.search(simpleName);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setStockResults(list);
    } catch (_err) {
      setStockResults([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Today';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <View style={styles.topRow}>
          <TopBar title="Health Records & Rx" back={true} onPressBack={() => router.back()} />
          <TouchableOpacity style={styles.fhirBtn} onPress={handleOpenFhirModal} activeOpacity={0.8}>
            <Text style={styles.fhirBtnText}>⚡ FHIR R4 JSON</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.red} />
            <Text style={{ marginTop: 12, color: colors.inkSoft, fontSize: 13 }}>
              Loading clinical records & prescriptions...
            </Text>
          </View>
        ) : records.length === 0 && referrals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="doctor" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyTitle}>No Clinical Records Yet</Text>
            <Text style={styles.emptySub}>
              Consultation notes, digital prescriptions, and hospital referrals will be automatically synced here in real time.
            </Text>
            <Button
              title="Book Doctor Appointment"
              variant="blue"
              style={{ marginTop: 16 }}
              onPress={() => router.push('/(patient)/consult-doctor')}
            />
          </Card>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Referrals Section (Phase 4) */}
            {referrals.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.sectionHeader}>ACTIVE HOSPITAL REFERRALS</Text>
                {referrals.map((ref) => (
                  <Card key={ref.id} style={styles.referralCard}>
                    <View style={styles.refHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.refHospital}>{ref.hospitalName}</Text>
                        <Text style={styles.refDoctor}>Referred by {ref.doctorName}</Text>
                      </View>
                      <Pill color={ref.status === 'ACCEPTED' ? 'success' : ref.status === 'COMPLETED' ? 'blue' : 'amber'}>
                        {ref.status}
                      </Pill>
                    </View>
                    <Text style={styles.refReason}>Reason: {ref.reason}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={styles.refDate}>{formatDate(ref.createdAt)}</Text>
                      <Pill color={ref.priority === 'HIGH' ? 'red' : 'grey'}>
                        {ref.priority} PRIORITY
                      </Pill>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Consultations & Digital Prescriptions (Phase 2 & 5) */}
            <Text style={styles.sectionHeader}>CONSULTATION TIMELINE & PRESCRIPTIONS</Text>
            {records.map((rec) => (
              <Card key={rec.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName}>{rec.doctorName}</Text>
                    <Text style={styles.doctorSub}>{rec.doctorSpecialty} · {rec.clinicName}</Text>
                  </View>
                  <Text style={styles.recordDate}>{formatDate(rec.createdAt)}</Text>
                </View>

                {/* Diagnosis Box */}
                <View style={styles.diagBox}>
                  <Text style={styles.diagTitle}>PRIMARY DIAGNOSIS</Text>
                  <Text style={styles.diagText}>{rec.diagnosis}</Text>
                </View>

                {/* Vitals */}
                {rec.vitals && (
                  <View style={styles.vitalsRow}>
                    {rec.vitals.bloodPressure && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>BP</Text>
                        <Text style={styles.vitalVal}>{rec.vitals.bloodPressure}</Text>
                      </View>
                    )}
                    {rec.vitals.heartRate && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Pulse</Text>
                        <Text style={styles.vitalVal}>{rec.vitals.heartRate} bpm</Text>
                      </View>
                    )}
                    {rec.vitals.spO2 && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>SpO2</Text>
                        <Text style={styles.vitalVal}>{rec.vitals.spO2}%</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Digital Prescription (Phase 5) */}
                {rec.prescriptions && rec.prescriptions.length > 0 && (
                  <View style={styles.rxSection}>
                    <View style={styles.rxHeader}>
                      <Text style={styles.rxTitle}>℞ DIGITAL PRESCRIPTION</Text>
                      <Text style={styles.rxCount}>{rec.prescriptions.length} items</Text>
                    </View>

                    {rec.prescriptions.map((med: any, mIdx: number) => (
                      <View key={mIdx} style={styles.medRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medName}>{med.name}</Text>
                          <Text style={styles.medDose}>
                            {med.dosage} · {med.frequency} · {med.duration}
                          </Text>
                          {med.instructions && (
                            <Text style={styles.medNotes}>ℹ️ {med.instructions}</Text>
                          )}
                        </View>
                        {/* Check Medicine Availability Button (Phase 6) */}
                        <TouchableOpacity
                          style={styles.stockCheckBtn}
                          onPress={() => handleCheckMedicineStock(med.name)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.stockCheckText}>Check Stock 🔍</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Clinical Notes */}
                {rec.notes ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.notesLabel}>DOCTOR NOTES & ADVICE</Text>
                    <Text style={styles.notesText}>{rec.notes}</Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </ScrollView>
        )}
      </Screen>
      <PatientNav active="/(patient)/history" />

      {/* FHIR R4 JSON Modal (Phase 3) */}
      <Modal visible={fhirModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>FHIR R4 Resource Bundle</Text>
                <Text style={styles.modalSub}>HL7 FHIR R4 Standard Healthcare Format</Text>
              </View>
              <TouchableOpacity onPress={() => setFhirModalVisible(false)} style={styles.closeBtn}>
                <Text style={{ fontSize: 18, color: colors.ink }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingFhir ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.blue} />
                <Text style={{ marginTop: 10, color: colors.inkSoft }}>Generating FHIR R4 Bundle...</Text>
              </View>
            ) : (
              <ScrollView style={styles.jsonBox} showsVerticalScrollIndicator={true}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(fhirBundle, null, 2)}
                </Text>
              </ScrollView>
            )}

            <Button
              title="Close FHIR Viewer"
              variant="secondary"
              style={{ marginTop: 12 }}
              onPress={() => setFhirModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Medicine Stock Availability Modal (Phase 6) */}
      <Modal visible={stockModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Medicine Stock Availability</Text>
                <Text style={styles.modalSub}>Searching Prayagraj Hospitals for: {selectedMedName}</Text>
              </View>
              <TouchableOpacity onPress={() => setStockModalVisible(false)} style={styles.closeBtn}>
                <Text style={{ fontSize: 18, color: colors.ink }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingStock ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.red} />
                <Text style={{ marginTop: 10, color: colors.inkSoft }}>Querying hospital pharmacy databases...</Text>
              </View>
            ) : stockResults.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.inkSoft }}>
                  No registered hospitals currently carry {selectedMedName}.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {stockResults.map((item) => {
                  const statusCol =
                    item.stockStatus === 'AVAILABLE'
                      ? 'success'
                      : item.stockStatus === 'LOW_STOCK'
                      ? 'amber'
                      : 'red';
                  return (
                    <Card key={item.id} style={styles.stockCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stockHospName}>{item.hospitalName}</Text>
                          <Text style={styles.stockMedName}>{item.medicineName}</Text>
                          <Text style={styles.stockCategory}>{item.category} · {item.dosageForm}</Text>
                        </View>
                        <Pill color={statusCol}>{item.stockStatus.replace('_', ' ')}</Pill>
                      </View>
                      {item.quantity !== undefined && (
                        <Text style={styles.stockQty}>Qty Available: {item.quantity} units</Text>
                      )}
                    </Card>
                  );
                })}
              </ScrollView>
            )}

            <Button
              title="Close Availability"
              variant="secondary"
              style={{ marginTop: 12 }}
              onPress={() => setStockModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  fhirBtn: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.blue,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  fhirBtnText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.inkSoft,
    letterSpacing: 0.5,
    marginVertical: 10,
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
  referralCard: {
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  refHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refHospital: { fontSize: 14, fontWeight: '700', color: colors.ink },
  refDoctor: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  refReason: { fontSize: 12, color: colors.inkSoft, marginTop: 6 },
  refDate: { fontSize: 10.5, color: colors.inkFaint },
  recordCard: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  doctorSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  recordDate: { fontSize: 10.5, color: colors.inkFaint },
  diagBox: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  diagTitle: { fontSize: 9.5, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.4 },
  diagText: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 2 },
  vitalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  vitalItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vitalLabel: { fontSize: 10, fontWeight: '700', color: colors.inkFaint },
  vitalVal: { fontSize: 11, fontWeight: '600', color: colors.ink },
  rxSection: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderColor: '#D0E3FF',
    borderWidth: 1,
  },
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rxTitle: { fontSize: 11, fontWeight: '800', color: colors.blue },
  rxCount: { fontSize: 10, color: colors.inkFaint },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  medName: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  medDose: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  medNotes: { fontSize: 10, color: colors.inkFaint, marginTop: 2 },
  stockCheckBtn: {
    backgroundColor: '#fff',
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stockCheckText: { fontSize: 10.5, fontWeight: '700', color: colors.blue },
  notesLabel: { fontSize: 9.5, fontWeight: '800', color: colors.inkFaint },
  notesText: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
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
    maxHeight: '85%',
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
  modalSub: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  closeBtn: { padding: 6 },
  jsonBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
  jsonText: {
    color: '#00FF66',
    fontFamily: 'monospace',
    fontSize: 10.5,
    lineHeight: 15,
  },
  stockCard: {
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stockHospName: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  stockMedName: { fontSize: 11.5, color: colors.blue, fontWeight: '600', marginTop: 2 },
  stockCategory: { fontSize: 10, color: colors.inkFaint, marginTop: 2 },
  stockQty: { fontSize: 10, color: colors.inkSoft, marginTop: 4 },
});

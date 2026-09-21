import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import { Screen, Card, TopBar, Pill, Button, Divider, Icon, HTitle, LabelEyebrow } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface LabResult {
  testName: string;
  value: string;
  normalRange: string;
  unit: string;
}

interface RecordItem {
  id: string;
  patientUid: string;
  crisisId: string;
  recordType: 'PRESCRIPTION' | 'LAB_REPORT' | 'DIAGNOSIS' | 'EMERGENCY_SUMMARY' | 'ALLERGY';
  title: string;
  facilityName: string;
  doctorName?: string;
  doctorSpecialty?: string;
  diagnosis?: string;
  date: string;
  allergies?: string[];
  medications?: Medication[];
  labResults?: LabResult[];
  attachmentUrl?: string | null;
  fhirBundle?: Record<string, any>;
  createdAt: string;
}

interface EmergencySummary {
  patientUid: string;
  crisisId?: string;
  bloodGroup?: string | null;
  activeAllergies: string[];
  currentMedications: Medication[];
  chronicConditions?: string[];
}

export default function PatientHealthRecordsScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const patientUid = userProfile?.uid || 'patient-demo-001';

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [summary, setSummary] = useState<EmergencySummary | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [fhirModalVisible, setFhirModalVisible] = useState(false);
  const [fhirJson, setFhirJson] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [timelineRes, summaryRes] = await Promise.allSettled([
        api.healthRecords.getByPatient(patientUid),
        api.healthRecords.getEmergencySummary(patientUid),
      ]);

      if (timelineRes.status === 'fulfilled' && timelineRes.value) {
        setRecords(Array.isArray(timelineRes.value) ? timelineRes.value : []);
      } else {
        // Fallback demo data if empty
        setRecords([
          {
            id: 'rec-demo-01',
            patientUid,
            crisisId: userProfile?.crisisId || 'AS-4232',
            recordType: 'PRESCRIPTION',
            title: 'Emergency Trauma Discharge & Antibiotics',
            facilityName: 'Max Healthcare Trauma Center',
            doctorName: 'Dr. Rajesh Sharma',
            doctorSpecialty: 'Trauma & Critical Care',
            diagnosis: 'Blunt chest contusion, resolved with conservative care',
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            allergies: ['Penicillin'],
            medications: [
              { name: 'Augmentin (Alternative: Azithromycin)', dosage: '500mg', frequency: 'Twice daily', duration: '5 days' },
              { name: 'Paracetamol', dosage: '650mg', frequency: 'SOS for pain', duration: '3 days' },
            ],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'rec-demo-02',
            patientUid,
            crisisId: userProfile?.crisisId || 'AS-4232',
            recordType: 'LAB_REPORT',
            title: 'Diagnostic Arterial Blood Gas & Cardiac Enzymes',
            facilityName: 'City Diagnostic Labs',
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            labResults: [
              { testName: 'Troponin-I', value: '0.01', normalRange: '< 0.04', unit: 'ng/mL' },
              { testName: 'Blood pH', value: '7.39', normalRange: '7.35 - 7.45', unit: 'pH' },
              { testName: 'Platelet Count', value: '240,000', normalRange: '150,000 - 450,000', unit: '/mcL' },
            ],
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummary(summaryRes.value);
      } else {
        setSummary({
          patientUid,
          crisisId: userProfile?.crisisId || 'AS-4232',
          bloodGroup: userProfile?.bloodGroup || 'O+',
          activeAllergies: ['Penicillin', 'Sulfa Drugs'],
          currentMedications: [
            { name: 'Atorvastatin', dosage: '20mg', frequency: 'Nightly', duration: 'Ongoing' },
          ],
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientUid]);

  const viewFhirBundle = (rec: RecordItem) => {
    const bundle = rec.fhirBundle || {
      resourceType: 'Bundle',
      id: `bundle-${rec.id}`,
      type: 'document',
      entry: [{ resource: { resourceType: 'Composition', title: rec.title } }],
    };
    setFhirJson(JSON.stringify(bundle, null, 2));
    setFhirModalVisible(true);
  };

  const handleShareFhir = async () => {
    try {
      await Share.share({
        title: 'FHIR R4 Medical Record Export',
        message: fhirJson,
      });
    } catch {
      Alert.alert('Notice', 'Unable to open share sheet on this device.');
    }
  };

  const getTypePillColor = (type: string) => {
    switch (type) {
      case 'PRESCRIPTION':
        return 'blue';
      case 'LAB_REPORT':
        return 'amber';
      case 'ALLERGY':
        return 'red';
      case 'EMERGENCY_SUMMARY':
        return 'orange';
      default:
        return 'success';
    }
  };

  return (
    <Screen padBottom={100}>
      <TopBar title="Longitudinal Health Record" />

      {/* Quick SOS Emergency Banner */}
      <View style={styles.emergencyBanner}>
        <View style={styles.bannerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.pulseDot} />
            <Text style={styles.bannerTitle}>EMERGENCY TRIAGE SUMMARY</Text>
          </View>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodLabel}>BLOOD GROUP</Text>
            <Text style={styles.bloodValue}>{summary?.bloodGroup || userProfile?.bloodGroup || 'O+'}</Text>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionSubtitle}>ACTIVE ALLERGIES (CRITICAL)</Text>
          <View style={styles.pillRow}>
            {(summary?.activeAllergies && summary.activeAllergies.length > 0) ? (
              summary.activeAllergies.map((allergy, i) => (
                <View key={i} style={styles.redAllergyPill}>
                  <Text style={styles.redAllergyText}>⚠️ {allergy}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.subtext}>No known drug allergies reported</Text>
            )}
          </View>
        </View>

        {summary?.currentMedications && summary.currentMedications.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.sectionSubtitle}>CURRENT MEDICATIONS</Text>
            <Text style={styles.medsSummary}>
              {summary.currentMedications.map((m) => `${m.name} (${m.dosage})`).join(' • ')}
            </Text>
          </View>
        )}
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.timelineHeading}>Medical Timeline</Text>
          <Text style={styles.timelineSubheading}>{records.length} chronological events recorded</Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/(patient)/health-records/add')}
        >
          <Text style={styles.addBtnText}>+ Add Record</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={{ marginTop: 12, color: colors.inkSoft, fontSize: 13 }}>
            Loading longitudinal EHR records...
          </Text>
        </View>
      ) : records.length === 0 ? (
        <Card style={{ padding: 24, alignItems: 'center', marginTop: 12 }}>
          <Icon name="idCard" size={32} color={colors.inkFaint} />
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink, marginTop: 10 }}>
            No Health Records Yet
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: 6 }}>
            Upload discharge summaries, doctor prescriptions, and lab tests to maintain your longitudinal medical record.
          </Text>
          <Button
            title="Add First Health Record"
            onPress={() => router.push('/(patient)/health-records/add')}
            style={{ marginTop: 16, width: '100%' }}
          />
        </Card>
      ) : (
        <View style={styles.timelineList}>
          {records.map((item, index) => {
            const dateStr = item.date
              ? new Date(item.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recent';

            return (
              <View key={item.id || index} style={styles.timelineCardWrapper}>
                {/* Timeline connector dot and line */}
                <View style={styles.timelineBar}>
                  <View style={styles.timelineDot} />
                  {index < records.length - 1 && <View style={styles.timelineConnector} />}
                </View>

                {/* Card Content */}
                <Card style={styles.recordCard}>
                  <Pressable onPress={() => setSelectedRecord(item)}>
                    <View style={styles.recordHeader}>
                      <Pill color={getTypePillColor(item.recordType) as any}>
                        {item.recordType.replace('_', ' ')}
                      </Pill>
                      <Text style={styles.recordDate}>{dateStr}</Text>
                    </View>

                    <Text style={styles.recordTitle}>{item.title}</Text>
                    <Text style={styles.facilityName}>🏥 {item.facilityName}</Text>

                    {item.doctorName ? (
                      <Text style={styles.doctorInfo}>
                        👨‍⚕️ {item.doctorName} {item.doctorSpecialty ? `• ${item.doctorSpecialty}` : ''}
                      </Text>
                    ) : null}

                    {item.diagnosis ? (
                      <View style={styles.diagnosisBox}>
                        <Text style={styles.diagnosisLabel}>DIAGNOSIS</Text>
                        <Text style={styles.diagnosisText}>{item.diagnosis}</Text>
                      </View>
                    ) : null}

                    {item.medications && item.medications.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.miniLabel}>Prescribed Meds ({item.medications.length})</Text>
                        <Text style={styles.miniDetail}>
                          {item.medications.map((m) => m.name).join(', ')}
                        </Text>
                      </View>
                    )}

                    {item.labResults && item.labResults.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.miniLabel}>Lab Findings ({item.labResults.length})</Text>
                        <Text style={styles.miniDetail}>
                          {item.labResults.map((l) => `${l.testName}: ${l.value} ${l.unit}`).join(' • ')}
                        </Text>
                      </View>
                    )}

                    <Divider />

                    <View style={styles.cardFooter}>
                      <Pressable
                        style={styles.fhirBtn}
                        onPress={() => viewFhirBundle(item)}
                      >
                        <Text style={styles.fhirBtnText}>🔗 ABDM / FHIR R4 JSON</Text>
                      </Pressable>
                      <Pressable
                        style={styles.detailsBtn}
                        onPress={() => setSelectedRecord(item)}
                      >
                        <Text style={styles.detailsBtnText}>View Details →</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                </Card>
              </View>
            );
          })}
        </View>
      )}

      {/* Record Details Modal */}
      <Modal
        visible={!!selectedRecord}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <LabelEyebrow>{selectedRecord?.recordType}</LabelEyebrow>
                <HTitle size={16}>{selectedRecord?.title}</HTitle>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setSelectedRecord(null)}
              >
                <Icon name="close" size={16} />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 18, maxHeight: 480 }}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Facility:</Text>
                <Text style={styles.metaValue}>{selectedRecord?.facilityName}</Text>
              </View>
              {selectedRecord?.doctorName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Doctor:</Text>
                  <Text style={styles.metaValue}>
                    {selectedRecord.doctorName} ({selectedRecord.doctorSpecialty || 'General'})
                  </Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Recorded Date:</Text>
                <Text style={styles.metaValue}>{selectedRecord?.date}</Text>
              </View>

              {selectedRecord?.diagnosis && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.sectionHeader}>Diagnosis & Clinical Impression</Text>
                  <Text style={styles.sectionBody}>{selectedRecord.diagnosis}</Text>
                </View>
              )}

              {selectedRecord?.medications && selectedRecord.medications.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.sectionHeader}>Prescription Details</Text>
                  {selectedRecord.medications.map((m, idx) => (
                    <View key={idx} style={styles.itemCard}>
                      <Text style={styles.itemName}>{m.name}</Text>
                      <Text style={styles.itemSub}>
                        {m.dosage} • {m.frequency} • Duration: {m.duration}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedRecord?.labResults && selectedRecord.labResults.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.sectionHeader}>Diagnostic Observations</Text>
                  {selectedRecord.labResults.map((l, idx) => (
                    <View key={idx} style={styles.itemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.itemName}>{l.testName}</Text>
                        <Text style={[styles.itemName, { color: colors.blue }]}>
                          {l.value} {l.unit}
                        </Text>
                      </View>
                      <Text style={styles.itemSub}>Standard Range: {l.normalRange}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 24, marginBottom: 12 }}>
                <Button
                  title="Export ABDM FHIR R4 Bundle"
                  variant="secondary"
                  onPress={() => {
                    if (selectedRecord) {
                      viewFhirBundle(selectedRecord);
                    }
                  }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Raw FHIR JSON Export Modal */}
      <Modal
        visible={fhirModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFhirModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '82%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fhirModalBadge}>HL7 FHIR R4 • ABDM COMPLIANT</Text>
                <HTitle size={15}>Raw Interoperability Bundle</HTitle>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setFhirModalVisible(false)}
              >
                <Icon name="close" size={16} />
              </Pressable>
            </View>

            <ScrollView style={styles.codeContainer}>
              <Text style={styles.codeText}>{fhirJson}</Text>
            </ScrollView>

            <View style={{ padding: 14, flexDirection: 'row', gap: 10 }}>
              <Button
                title="Share / Download"
                variant="primary"
                onPress={handleShareFhir}
                style={{ flex: 1 }}
              />
              <Button
                title="Close"
                variant="ghost"
                onPress={() => setFhirModalVisible(false)}
                style={{ width: 90 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergencyBanner: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 20,
    ...shadow.card,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red,
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
    letterSpacing: 0.8,
  },
  bloodBadge: {
    backgroundColor: colors.red,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  bloodLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  bloodValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkSoft,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  redAllergyPill: {
    backgroundColor: '#FFEAEA',
    borderWidth: 1,
    borderColor: '#FF8A80',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  redAllergyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D32F2F',
  },
  subtext: {
    fontSize: 12,
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
  medsSummary: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timelineHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  timelineSubheading: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineList: {
    marginTop: 4,
  },
  timelineCardWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineBar: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.blue,
    borderWidth: 2.5,
    borderColor: colors.blueBg,
    marginTop: 14,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.line,
    marginTop: 4,
  },
  recordCard: {
    flex: 1,
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 11,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  facilityName: {
    fontSize: 12,
    color: colors.inkSoft,
    fontWeight: '600',
    marginBottom: 2,
  },
  doctorInfo: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginBottom: 6,
  },
  diagnosisBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: radii.sm,
    padding: 8,
    marginVertical: 6,
  },
  diagnosisLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.inkFaint,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  diagnosisText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '600',
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  miniDetail: {
    fontSize: 11.5,
    color: colors.inkSoft,
    fontWeight: '500',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  fhirBtn: {
    backgroundColor: colors.blueBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  fhirBtnText: {
    color: colors.blue,
    fontSize: 10.5,
    fontWeight: '700',
  },
  detailsBtn: {
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionHeader: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  itemSub: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
  fhirModalBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.blue,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    padding: 14,
    margin: 14,
    borderRadius: radii.md,
    maxHeight: 400,
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#38BDF8',
    fontSize: 10.5,
    lineHeight: 15,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii } from '@/constants/theme';
import { Screen, Card, TopBar, Button, Input, InputGroup, Chip, LabelEyebrow, Icon } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

type RecordType = 'PRESCRIPTION' | 'LAB_REPORT' | 'DIAGNOSIS' | 'ALLERGY';

export default function AddHealthRecordScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const patientUid = userProfile?.uid || 'patient-demo-001';

  const [recordType, setRecordType] = useState<RecordType>('PRESCRIPTION');
  const [title, setTitle] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);

  // Medication form fields
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medDuration, setMedDuration] = useState('');
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; frequency: string; duration: string }>>([]);

  // Lab result form fields
  const [testName, setTestName] = useState('');
  const [testValue, setTestValue] = useState('');
  const [testRange, setTestRange] = useState('');
  const [testUnit, setTestUnit] = useState('');
  const [labResults, setLabResults] = useState<Array<{ testName: string; value: string; normalRange: string; unit: string }>>([]);

  const [documentAttached, setDocumentAttached] = useState(false);
  const [loading, setLoading] = useState(false);

  const addMedication = () => {
    if (!medName.trim()) {
      Alert.alert('Required', 'Please enter medicine name.');
      return;
    }
    setMedications([
      ...medications,
      {
        name: medName.trim(),
        dosage: medDosage.trim() || 'Standard',
        frequency: medFrequency.trim() || 'Once daily',
        duration: medDuration.trim() || '5 days',
      },
    ]);
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setMedDuration('');
  };

  const addLabTest = () => {
    if (!testName.trim() || !testValue.trim()) {
      Alert.alert('Required', 'Please enter test name and result value.');
      return;
    }
    setLabResults([
      ...labResults,
      {
        testName: testName.trim(),
        value: testValue.trim(),
        normalRange: testRange.trim() || 'Normal',
        unit: testUnit.trim() || '',
      },
    ]);
    setTestName('');
    setTestValue('');
    setTestRange('');
    setTestUnit('');
  };

  const addAllergy = () => {
    if (!allergyInput.trim()) return;
    if (!allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
    }
    setAllergyInput('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a record title (e.g. Cardiology Prescription).');
      return;
    }

    setLoading(true);
    try {
      await api.healthRecords.create({
        patientUid,
        crisisId: userProfile?.crisisId || 'AS-4232',
        recordType,
        title: title.trim(),
        facilityName: facilityName.trim() || 'Hospital Facility',
        doctorName: doctorName.trim() || undefined,
        doctorSpecialty: doctorSpecialty.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        date: new Date().toISOString(),
        allergies: allergies.length > 0 ? allergies : undefined,
        medications: medications.length > 0 ? medications : undefined,
        labResults: labResults.length > 0 ? labResults : undefined,
        attachmentUrl: documentAttached ? 'https://storage.googleapis.com/golden-hour/demo-ehr.pdf' : null,
      });

      Alert.alert('Success', 'Health record saved with ABDM FHIR R4 Bundle!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save health record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padBottom={110}>
      <TopBar title="Add Health Record" />

      {/* Record Type Selector */}
      <View style={{ marginBottom: 18 }}>
        <LabelEyebrow>SELECT RECORD CATEGORY</LabelEyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip
            label="💊 Prescription"
            selected={recordType === 'PRESCRIPTION'}
            onPress={() => setRecordType('PRESCRIPTION')}
          />
          <Chip
            label="🧪 Lab Report"
            selected={recordType === 'LAB_REPORT'}
            onPress={() => setRecordType('LAB_REPORT')}
          />
          <Chip
            label="⚠️ Allergy"
            selected={recordType === 'ALLERGY'}
            onPress={() => setRecordType('ALLERGY')}
          />
          <Chip
            label="📋 Diagnosis"
            selected={recordType === 'DIAGNOSIS'}
            onPress={() => setRecordType('DIAGNOSIS')}
          />
        </ScrollView>
      </View>

      <Card style={{ padding: 18, marginBottom: 18 }}>
        <InputGroup label="Record Title *">
          <Input
            placeholder="e.g. Post-ER Discharge Summary, ECG Report"
            value={title}
            onChangeText={setTitle}
          />
        </InputGroup>

        <InputGroup label="Hospital / Facility Name">
          <Input
            placeholder="e.g. Apollo Hospital, Max Healthcare"
            value={facilityName}
            onChangeText={setFacilityName}
          />
        </InputGroup>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <InputGroup label="Doctor Name">
              <Input
                placeholder="Dr. Name"
                value={doctorName}
                onChangeText={setDoctorName}
              />
            </InputGroup>
          </View>
          <View style={{ flex: 1 }}>
            <InputGroup label="Specialty">
              <Input
                placeholder="e.g. Cardiology"
                value={doctorSpecialty}
                onChangeText={setDoctorSpecialty}
              />
            </InputGroup>
          </View>
        </View>

        <InputGroup label="Diagnosis / Clinical Notes">
          <Input
            placeholder="Key findings, reason for visit..."
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
          />
        </InputGroup>
      </Card>

      {/* Dynamic Sections Based on Type */}
      {recordType === 'PRESCRIPTION' && (
        <Card style={{ padding: 18, marginBottom: 18 }}>
          <LabelEyebrow>PRESCRIBED MEDICATIONS</LabelEyebrow>

          {medications.map((m, idx) => (
            <View key={idx} style={styles.itemTag}>
              <Text style={styles.itemTagText}>
                {m.name} — {m.dosage}, {m.frequency} ({m.duration})
              </Text>
              <Pressable
                onPress={() => setMedications(medications.filter((_, i) => i !== idx))}
              >
                <Text style={{ color: colors.red, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          ))}

          <View style={{ marginTop: 8 }}>
            <InputGroup label="Medicine Name">
              <Input
                placeholder="e.g. Azithromycin"
                value={medName}
                onChangeText={setMedName}
              />
            </InputGroup>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <InputGroup label="Dosage">
                  <Input placeholder="500mg" value={medDosage} onChangeText={setMedDosage} />
                </InputGroup>
              </View>
              <View style={{ flex: 1 }}>
                <InputGroup label="Frequency">
                  <Input placeholder="Twice a day" value={medFrequency} onChangeText={setMedFrequency} />
                </InputGroup>
              </View>
              <View style={{ flex: 1 }}>
                <InputGroup label="Duration">
                  <Input placeholder="5 days" value={medDuration} onChangeText={setMedDuration} />
                </InputGroup>
              </View>
            </View>
            <Button title="+ Add Medicine to List" variant="secondary" onPress={addMedication} />
          </View>
        </Card>
      )}

      {recordType === 'LAB_REPORT' && (
        <Card style={{ padding: 18, marginBottom: 18 }}>
          <LabelEyebrow>LAB TEST OBSERVATIONS</LabelEyebrow>

          {labResults.map((l, idx) => (
            <View key={idx} style={styles.itemTag}>
              <Text style={styles.itemTagText}>
                {l.testName}: {l.value} {l.unit} (Ref: {l.normalRange})
              </Text>
              <Pressable
                onPress={() => setLabResults(labResults.filter((_, i) => i !== idx))}
              >
                <Text style={{ color: colors.red, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          ))}

          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 2 }}>
                <InputGroup label="Test Name">
                  <Input placeholder="e.g. Hemoglobin" value={testName} onChangeText={setTestName} />
                </InputGroup>
              </View>
              <View style={{ flex: 1 }}>
                <InputGroup label="Value">
                  <Input placeholder="13.5" value={testValue} onChangeText={setTestValue} />
                </InputGroup>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <InputGroup label="Unit">
                  <Input placeholder="g/dL" value={testUnit} onChangeText={setTestUnit} />
                </InputGroup>
              </View>
              <View style={{ flex: 2 }}>
                <InputGroup label="Normal Range">
                  <Input placeholder="12.0 - 16.0" value={testRange} onChangeText={setTestRange} />
                </InputGroup>
              </View>
            </View>
            <Button title="+ Add Lab Result Item" variant="secondary" onPress={addLabTest} />
          </View>
        </Card>
      )}

      {/* Allergies Tagging */}
      <Card style={{ padding: 18, marginBottom: 18 }}>
        <LabelEyebrow>ALLERGIES LINKED TO THIS RECORD</LabelEyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {allergies.map((a, i) => (
            <View key={i} style={styles.allergyBadge}>
              <Text style={styles.allergyBadgeText}>⚠️ {a}</Text>
              <Pressable onPress={() => setAllergies(allergies.filter((_, idx) => idx !== i))}>
                <Text style={{ color: '#D32F2F', fontWeight: '800', marginLeft: 4 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="e.g. Penicillin, NSAIDs, Peanuts"
              value={allergyInput}
              onChangeText={setAllergyInput}
            />
          </View>
          <Button title="Add" variant="secondary" onPress={addAllergy} style={{ width: 70 }} />
        </View>
      </Card>

      {/* Document Attachment Placeholder */}
      <Card style={{ padding: 18, marginBottom: 24 }}>
        <LabelEyebrow>ATTACH DOCUMENT / PRESCRIPTION SLIP</LabelEyebrow>
        <Pressable
          style={[styles.attachBox, documentAttached && styles.attachBoxActive]}
          onPress={() => setDocumentAttached(!documentAttached)}
        >
          <Icon name="camera" size={24} color={documentAttached ? colors.success : colors.inkSoft} />
          <Text style={[styles.attachText, documentAttached && { color: colors.success, fontWeight: '700' }]}>
            {documentAttached ? '✓ Medical Slip Attached (demo-ehr.pdf)' : '+ Tap to Scan / Attach Document'}
          </Text>
        </Pressable>
      </Card>

      {/* Submit Button */}
      <Button
        title={loading ? 'Building FHIR R4 Bundle & Saving...' : 'Save & Publish to ABDM EHR'}
        onPress={handleSave}
        loading={loading}
        disabled={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 8,
  },
  itemTagText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    borderWidth: 1,
    borderColor: '#FF8A80',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  allergyBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D32F2F',
  },
  attachBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
  },
  attachBoxActive: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  attachText: {
    fontSize: 12.5,
    color: colors.inkSoft,
    fontWeight: '500',
  },
});

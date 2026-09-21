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
import { colors, radii, shadow } from '@/constants/theme';
import { Screen, Card, TopBar, Button, Input, InputGroup, Chip, LabelEyebrow, Pill } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

const TARGET_HOSPITALS = [
  { id: 'hosp-apollo-delhi', name: 'Apollo Emergency & Speciality Hospital', address: 'Sarita Vihar, Delhi' },
  { id: 'hosp-max-saket', name: 'Max Super Speciality Hospital & Trauma Unit', address: 'Saket, New Delhi' },
  { id: 'hosp-fortis-escorts', name: 'Fortis Escorts Heart Institute', address: 'Okhla, New Delhi' },
  { id: 'hosp-aiims-trauma', name: 'AIIMS Apex Trauma Center', address: 'Ring Road, New Delhi' },
  { id: 'hosp-manipal-blr', name: 'Manipal Hospital & Critical Care', address: 'HAL Airport Rd, Bengaluru' },
];

const DEPARTMENTS = [
  'Trauma & Critical Care',
  'Cardiology & Cath Lab',
  'Neurology & Stroke Unit',
  'Orthopedics & Spine',
  'Emergency Medicine',
  'General Surgery',
];

export default function DoctorCreateReferralScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const doctorUid = userProfile?.uid || 'doc-dr-sharma';

  const [crisisId, setCrisisId] = useState('AS-4232');
  const [patientName, setPatientName] = useState('Rahul Verma');
  const [patientPhone, setPatientPhone] = useState('+91 98765 43210');
  const [selectedHospital, setSelectedHospital] = useState(TARGET_HOSPITALS[0]);
  const [selectedDepartment, setSelectedDepartment] = useState(DEPARTMENTS[0]);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('EMERGENCY');
  const [reason, setReason] = useState('Critical blunt trauma with suspected internal bleeding');
  const [clinicalNotes, setClinicalNotes] = useState(
    'Patient stabilized at primary clinic. BP 90/60, SpO2 93%. IV line established. Immediate CT angiography and ICU bed required upon arrival.'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!crisisId.trim()) {
      Alert.alert('Missing Field', 'Please enter Patient Crisis ID.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Missing Field', 'Please enter the reason for referral.');
      return;
    }

    setSubmitting(true);
    try {
      await api.referrals.create({
        patientUid: `patient-${crisisId.trim()}`,
        patientName: patientName.trim() || 'Patient',
        patientPhone: patientPhone.trim(),
        crisisId: crisisId.trim(),
        referringDoctorId: doctorUid,
        referringDoctorName: userProfile?.name || 'Dr. Rajesh Sharma',
        referringFacilityName: userProfile?.clinicName || 'Apex Emergency Clinic',
        targetHospitalId: selectedHospital.id,
        targetHospitalName: selectedHospital.name,
        targetDepartment: selectedDepartment,
        priority,
        reasonForReferral: reason.trim(),
        clinicalNotes: clinicalNotes.trim(),
      });

      Alert.alert(
        'Referral Dispatched! 🚀',
        `Urgent referral sent to ${selectedHospital.name} (${selectedDepartment}). Hospital staff alerted.`,
        [
          {
            text: 'View Outgoing Queue',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Referral Failed', err?.message || 'Unable to submit referral.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen padBottom={110}>
      <TopBar title="Doctor Referral Dispatch" />

      {/* Patient Identification Card */}
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <LabelEyebrow>PATIENT IDENTIFICATION</LabelEyebrow>
        <InputGroup label="Crisis ID / Golden Hour ID *">
          <Input
            placeholder="e.g. AS-4232 or GH-8891"
            value={crisisId}
            onChangeText={setCrisisId}
          />
        </InputGroup>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <InputGroup label="Patient Name">
              <Input
                placeholder="Full Name"
                value={patientName}
                onChangeText={setPatientName}
              />
            </InputGroup>
          </View>
          <View style={{ flex: 1 }}>
            <InputGroup label="Phone Number">
              <Input
                placeholder="+91..."
                value={patientPhone}
                onChangeText={setPatientPhone}
              />
            </InputGroup>
          </View>
        </View>
      </Card>

      {/* Urgency / Priority Selection */}
      <View style={{ marginBottom: 16 }}>
        <LabelEyebrow>CLINICAL URGENCY / PRIORITY</LabelEyebrow>
        <View style={styles.priorityRow}>
          <Pressable
            style={[styles.priorityCard, priority === 'EMERGENCY' && styles.priorityEmergency]}
            onPress={() => setPriority('EMERGENCY')}
          >
            <Text style={[styles.priorityTag, priority === 'EMERGENCY' && { color: '#D32F2F' }]}>🔴 EMERGENCY</Text>
            <Text style={styles.priorityDesc}>Immediate bed & OR/ICU reservation</Text>
          </Pressable>

          <Pressable
            style={[styles.priorityCard, priority === 'URGENT' && styles.priorityUrgent]}
            onPress={() => setPriority('URGENT')}
          >
            <Text style={[styles.priorityTag, priority === 'URGENT' && { color: '#C2610C' }]}>🟡 URGENT</Text>
            <Text style={styles.priorityDesc}>Within 2 to 4 hours</Text>
          </Pressable>

          <Pressable
            style={[styles.priorityCard, priority === 'ROUTINE' && styles.priorityRoutine]}
            onPress={() => setPriority('ROUTINE')}
          >
            <Text style={[styles.priorityTag, priority === 'ROUTINE' && { color: '#2E7D32' }]}>🟢 ROUTINE</Text>
            <Text style={styles.priorityDesc}>Standard specialist consult</Text>
          </Pressable>
        </View>
      </View>

      {/* Target Hospital & Department */}
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <LabelEyebrow>TARGET RECEPTIVE HOSPITAL</LabelEyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TARGET_HOSPITALS.map((hosp) => {
              const isSelected = selectedHospital.id === hosp.id;
              return (
                <Pressable
                  key={hosp.id}
                  style={[styles.hospitalChip, isSelected && styles.hospitalChipSelected]}
                  onPress={() => setSelectedHospital(hosp)}
                >
                  <Text style={[styles.hospitalName, isSelected && { color: '#FFF' }]}>
                    🏥 {hosp.name}
                  </Text>
                  <Text style={[styles.hospitalAddress, isSelected && { color: '#FFEAEA' }]}>
                    {hosp.address}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <LabelEyebrow>REQUIRED CLINICAL DEPARTMENT</LabelEyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {DEPARTMENTS.map((dept) => (
            <Chip
              key={dept}
              label={dept}
              selected={selectedDepartment === dept}
              onPress={() => setSelectedDepartment(dept)}
            />
          ))}
        </View>
      </Card>

      {/* Clinical Notes & Reason */}
      <Card style={{ padding: 18, marginBottom: 24 }}>
        <LabelEyebrow>CLINICAL HANDOFF DETAILS</LabelEyebrow>
        <InputGroup label="Reason for Referral *">
          <Input
            placeholder="Primary clinical justification..."
            value={reason}
            onChangeText={setReason}
          />
        </InputGroup>

        <InputGroup label="Clinical Handoff Notes & Vitals">
          <Input
            placeholder="Vitals, fluids given, medication administered..."
            value={clinicalNotes}
            onChangeText={setClinicalNotes}
            multiline
          />
        </InputGroup>
      </Card>

      {/* Submit Action */}
      <Button
        title={submitting ? 'Dispatching Referral...' : `Dispatch Referral to ${selectedHospital.name.split(' ')[0]}`}
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  priorityRow: {
    gap: 8,
  },
  priorityCard: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: 12,
  },
  priorityEmergency: {
    borderColor: colors.red,
    backgroundColor: '#FFF5F5',
  },
  priorityUrgent: {
    borderColor: colors.orange,
    backgroundColor: '#FFF9F2',
  },
  priorityRoutine: {
    borderColor: colors.success,
    backgroundColor: '#F3FBF4',
  },
  priorityTag: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  priorityDesc: {
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
  },
  hospitalChip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: '#FFF',
    width: 210,
  },
  hospitalChipSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  hospitalName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
  },
  hospitalAddress: {
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 2,
  },
});

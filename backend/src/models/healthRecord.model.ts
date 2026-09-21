export type HealthRecordType =
  | 'PRESCRIPTION'
  | 'LAB_REPORT'
  | 'DIAGNOSIS'
  | 'EMERGENCY_SUMMARY'
  | 'ALLERGY';

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface LabResultItem {
  testName: string;
  value: string;
  normalRange: string;
  unit: string;
}

export interface HealthRecord {
  id: string;
  patientUid: string;
  crisisId: string; // e.g. "AS-4232"
  recordType: HealthRecordType;
  title: string;
  facilityName: string;
  doctorName?: string;
  doctorSpecialty?: string;
  diagnosis?: string;
  date: string;
  allergies?: string[];
  medications?: MedicationItem[];
  labResults?: LabResultItem[];
  attachmentUrl?: string | null;
  fhirBundle?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyHealthSummary {
  patientUid: string;
  crisisId?: string;
  bloodGroup?: string | null;
  activeAllergies: string[];
  currentMedications: MedicationItem[];
  chronicConditions?: string[];
  lastUpdated: string;
}

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PatientVitals {
  bloodPressure?: string; // e.g., "120/80"
  heartRate?: number;    // e.g., 72
  temperature?: string;  // e.g., "98.6 F"
  spO2?: number;         // e.g., 98
}

export interface HealthRecord {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  appointmentId?: string;
  tokenNumber?: number;
  diagnosis: string;
  notes?: string;
  vitals?: PatientVitals;
  prescriptions: PrescribedMedicine[];
  referralId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthRecordRequest {
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  appointmentId?: string;
  tokenNumber?: number;
  diagnosis: string;
  notes?: string;
  vitals?: PatientVitals;
  prescriptions?: PrescribedMedicine[];
  referral?: {
    hospitalId: string;
    hospitalName?: string;
    reason: string;
    priority?: "HIGH" | "NORMAL";
  };
}

export type ReferralPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export type ReferralStatus =
  | 'CREATED'
  | 'HOSPITAL_ACCEPTED'
  | 'REJECTED'
  | 'PATIENT_ARRIVED'
  | 'IN_TREATMENT'
  | 'COMPLETED';

export interface Referral {
  id: string;
  patientUid: string;
  patientName: string;
  patientPhone: string;
  crisisId: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringFacilityName: string;
  targetHospitalId: string;
  targetHospitalName: string;
  targetDepartment: string;
  priority: ReferralPriority;
  reasonForReferral: string;
  clinicalNotes: string;
  attachedRecordIds?: string[];
  status: ReferralStatus;
  rejectionReason?: string;
  hospitalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

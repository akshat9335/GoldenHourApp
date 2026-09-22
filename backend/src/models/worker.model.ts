/**
 * Worker Firestore document models.
 * Collection: communityPatients — ASHA worker registered rural patients.
 * Collection: communityVisits  — Home visit records with vitals and AI triage.
 */

export interface CommunityPatient {
  id: string;
  crisisId: string;
  workerUid: string;
  workerName: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  villageOrArea: string;
  bloodGroup?: string;
  knownConditions?: string[];
  isPregnant?: boolean;
  expectedDeliveryDate?: string;
  lastVisitDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityVisit {
  id: string;
  patientId: string;
  patientName: string;
  workerUid: string;
  vitals: {
    bloodPressure?: string;
    bloodSugar?: number;
    spO2?: number;
    temperature?: number;
    pulse?: number;
  };
  symptoms: string;
  aiTriageSeverity?: 'NORMAL' | 'MODERATE' | 'CRITICAL';
  aiGuidanceInHindi?: string;
  referredToHospitalId?: string | null;
  visitDate: string;
  syncedFromOffline: boolean;
  createdAt: string;
}

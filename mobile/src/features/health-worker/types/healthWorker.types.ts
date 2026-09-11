export type HealthWorkerRole = "ASHA" | "ANM" | "PHC_NURSE" | "COMMUNITY_OFFICER";
export type ConsciousnessLevel = "ALERT" | "VOICE_RESPONSIVE" | "PAIN_RESPONSIVE" | "UNRESPONSIVE";
export type Language = "en" | "hi";

export interface FrontlineVitals {
  pulseRateBpm?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  oxygenSpo2?: number;
  consciousness: ConsciousnessLevel;
  bleedingActive: boolean;
  fractureSuspected: boolean;
}

export interface FrontlinePatientReferral {
  referralId: string;
  workerId: string;
  patientName: string;
  patientAge: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  villageOrLocality: string;
  incidentType: string;
  vitals: FrontlineVitals;
  triagePriority: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  recommendedFacilityType: string;
  targetHospitalId?: string;
  status: "CREATED" | "TRANSMITTED" | "ACCEPTED" | "AMBULANCE_DISPATCHED";
  timestamp: string;
}

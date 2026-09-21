export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type AiSource = "mock" | "gemini" | "fallback";

export interface PatientInfo {
  age?: number;
  gender?: string;
}

export interface InjuryInfo {
  present?: boolean;
  type?: string | null;
  description?: string;
}

export interface VitalSigns {
  heartRate?: number;
  oxygenSaturation?: number;
  bloodPressure?: string;
  temperature?: number;
  respiratoryRate?: number;
}

export interface BleedingInfo {
  present?: boolean;
  severity?: "minor" | "moderate" | "severe" | "uncontrolled" | string | null;
}

export interface LocationInfo {
  latitude?: number | null;
  longitude?: number | null;
}

export interface EmergencyInput {
  patient?: PatientInfo;
  symptoms: string[];
  injury?: InjuryInfo;
  vitalSigns?: VitalSigns;
  consciousness?: "conscious" | "confused" | "drowsy" | "unconscious" | string;
  breathing?: "normal" | "difficult" | "abnormal" | "not_breathing" | string;
  bleeding?: BleedingInfo;
  location?: LocationInfo;
  notes?: string;
}

export interface TriageResult {
  severity: Severity;
  emergencyType: string;
  confidence: number;
  immediateActions: string[];
  avoidActions: string[];
  hospitalRequired: boolean;
  ambulanceRecommended: boolean;
  explanation: string;
  disclaimer: string;
  source: AiSource;
}

export interface ImageAnalysisInput {
  imageBase64?: string;
  /** Alias accepted for clients that call the field imageData. */
  imageData?: string;
  /** Alias accepted by simple multipart/proxy clients. */
  image?: string;
  mimeType: string;
  context?: string;
}

export interface ImageAnalysisResult {
  findings: string[];
  possibleInjuries: string[];
  severity: Severity;
  confidence: number;
  immediateActions: string[];
  requiresProfessionalAssessment: boolean;
  explanation: string;
  disclaimer: string;
  source: AiSource;
  isAuthentic?: boolean;
  authenticityAssessment?: string;
  authenticityScore?: number;
}

export interface FirstAidInput {
  emergencyType?: string;
  symptoms?: string[];
  injuryType?: string;
  severity?: Severity;
  context?: string;
}

export interface FirstAidResult {
  title: string;
  steps: string[];
  doNot: string[];
  callEmergencyServices: boolean;
  explanation: string;
  disclaimer: string;
  source: AiSource;
}

export const AI_DISCLAIMER =
  "AI-generated emergency decision support. It is not a medical diagnosis.";

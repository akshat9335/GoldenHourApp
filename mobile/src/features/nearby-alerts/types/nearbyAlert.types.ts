export type EmergencySeverity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface NearbyEmergencyAlert {
  incidentId: string;
  severity: EmergencySeverity;
  distanceKm: number;
  etaMinutes: number;
  latitude: number;
  longitude: number;
  description: string;
  confirmationCount: number;
  reportedAt: string;
  responderRole?: string;
}

export interface ResponderRegistration {
  userId: string;
  fcmToken: string;
  latitude: number;
  longitude: number;
  isAvailableForAlerts: boolean;
  alertRadiusKm: number; // e.g. default 5 km
  skills?: string[]; // e.g. ["CPR", "First Aid", "Nursing"]
}

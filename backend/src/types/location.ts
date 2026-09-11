export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UserLocationUpdate {
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
  role?: "user" | "driver" | "doctor" | "worker";
}

export interface StoredLocation extends UserLocationUpdate {
  updatedAt: string;
}

export interface HospitalFacility {
  hospitalId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  etaMinutes: number;
  emergencyCapability: string[];
  availableCapacity: number;
  traumaLevel: number;
  icuAvailable: boolean;
  specialistsAvailable: string[];
  diagnosticAvailability: string[];
  verified: boolean;
}

export interface NearbyIncidentSummary {
  incidentId: string;
  approximateLocation: {
    lat: number;
    lng: number;
  };
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  confirmationCount: number;
  status: "REPORTED" | "VERIFIED" | "DISPATCHED" | "RESOLVED";
  distanceKm: number;
  reportedAt: string;
}

export interface RouteInfo {
  origin: Coordinates;
  destination: Coordinates;
  distanceKm: number;
  durationMin: number;
  summary?: string;
  provider: "google_maps" | "standard_haversine";
}

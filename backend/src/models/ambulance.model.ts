export type AmbulanceStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "EN_ROUTE_TO_PATIENT"
  | "AT_PATIENT"
  | "PATIENT_ONBOARD"
  | "EN_ROUTE_TO_HOSPITAL"
  | "AT_HOSPITAL"
  | "COMPLETED"
  | "OFFLINE";

export interface Ambulance {
  ambulanceId: string;
  registrationNumber: string;
  type: string;
  equipment: string[];
  ownerRef?: string;
  hospitalRef?: string;
  driverId?: string;
  status: AmbulanceStatus;
  locationRef?: string;
  createdAt: string;
  updatedAt: string;
}

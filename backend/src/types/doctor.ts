export type DoctorVerificationStatus = "PENDING" | "VERIFIED" | "APPROVED" | "REJECTED";
export type DoctorAvailability = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface ClinicDetails {
  clinicId: string;
  clinicName: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  workingHours: string;
  facilities?: string[];
}

export interface DoctorProfile {
  doctorId: string;
  userId: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  licenseNumber: string;
  verificationStatus: DoctorVerificationStatus;
  clinicId: string;
  consultationFee: number;
  availability: DoctorAvailability;
  rating?: number;
  servingToken: number;
  queueLength: number;
  estimatedWaitMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorCardItem extends DoctorProfile {
  distanceKm?: number;
  clinic?: ClinicDetails;
}

export interface RegisterDoctorRequest {
  doctorId?: string;
  userId: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  licenseNumber: string;
  clinicId: string;
  consultationFee?: number;
}

export type ReferralStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
export type ReferralPriority = "HIGH" | "NORMAL";

export interface DoctorReferral {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  reason: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferralRequest {
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  hospitalId: string;
  hospitalName?: string;
  reason: string;
  priority?: ReferralPriority;
  notes?: string;
}

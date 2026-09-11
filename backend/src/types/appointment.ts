export type AppointmentStatus =
  | "BOOKED"
  | "CONFIRMED"
  | "WAITING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  clinicId: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "17:00"
  tokenNumber: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  doctorId: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "17:00"
  notes?: string;
}

export interface LiveQueueState {
  doctorId: string;
  date: string;
  servingToken: number;
  totalTokensIssued: number;
  avgConsultationMinutes: number;
  waitingCount: number;
}

export interface PatientQueueView {
  doctorId: string;
  doctorName: string;
  clinicName: string;
  servingToken: number;
  yourToken: number;
  queueAhead: number;
  estimatedWaitMinutes: number;
  status: AppointmentStatus;
}

export interface TravelRecommendation {
  appointmentId: string;
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  appointmentTime: string; // e.g. "17:00"
  distanceKm: number;
  travelDurationMin: number;
  bufferMin: number;
  recommendedDepartureTime: string; // e.g. "16:25"
  status: string;
}

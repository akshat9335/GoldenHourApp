export type DiagnosticCategory = 'PATHOLOGY' | 'RADIOLOGY' | 'CARDIOLOGY';

export type DiagnosticBookingStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'SAMPLE_COLLECTED'
  | 'REPORT_READY'
  | 'CANCELLED';

export interface DiagnosticBooking {
  id: string;
  patientUid: string;
  patientName: string;
  patientPhone: string;
  crisisId: string;
  facilityId: string;
  facilityName: string;
  testName: string;
  category: DiagnosticCategory;
  prescribedByDoctorId?: string;
  prescribedByDoctorName?: string;
  scheduledDate: string;
  slotTime: string;
  status: DiagnosticBookingStatus;
  reportUrl?: string | null;
  reportSummary?: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticCatalogItem {
  id: string;
  name: string;
  category: DiagnosticCategory;
  description: string;
  turnaroundTime: string;
  price: number;
  isEmergency: boolean;
  fastingRequired?: boolean;
}

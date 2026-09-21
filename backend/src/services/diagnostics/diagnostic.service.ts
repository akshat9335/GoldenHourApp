import { firestore } from '../../config/firebase';
import {
  DiagnosticBooking,
  DiagnosticCatalogItem,
} from '../../models/diagnostic.model';
import { AppError } from '../../utils/AppError';

// Standard Pre-Defined Diagnostic Catalog
export const DIAGNOSTIC_CATALOG: DiagnosticCatalogItem[] = [
  {
    id: 'diag-trop-i',
    name: 'Troponin-I Rapid Quantitative (Cardiac Biomarker)',
    category: 'CARDIOLOGY',
    description: 'Gold-standard biomarker for acute myocardial infarction (heart attack) diagnosis.',
    turnaroundTime: '20 mins (Stat / Emergency)',
    price: 850,
    isEmergency: true,
  },
  {
    id: 'diag-ecg-12',
    name: '12-Lead Emergency ECG with Rhythm Strip',
    category: 'CARDIOLOGY',
    description: 'Immediate electrical activity test for STEMI, arrhythmias, and ischemia.',
    turnaroundTime: '10 mins (Immediate)',
    price: 350,
    isEmergency: true,
  },
  {
    id: 'diag-ct-brain',
    name: 'CT Scan Brain (Non-Contrast Trauma Protocol)',
    category: 'RADIOLOGY',
    description: 'Emergency high-resolution scan for intracranial hemorrhage, stroke, or head injury.',
    turnaroundTime: '30 mins (Stat)',
    price: 2400,
    isEmergency: true,
  },
  {
    id: 'diag-xray-chest',
    name: 'Digital Chest X-Ray (PA & Lateral)',
    category: 'RADIOLOGY',
    description: 'Evaluates lungs, ribs, cardiomegaly, pneumonia, and pleural effusion.',
    turnaroundTime: '15 mins',
    price: 450,
    isEmergency: false,
  },
  {
    id: 'diag-cbc-plt',
    name: 'Complete Blood Count (CBC) with Platelets & ESR',
    category: 'PATHOLOGY',
    description: 'Hemoglobin, RBC, WBC differential, platelet count for infection and trauma screening.',
    turnaroundTime: '45 mins',
    price: 320,
    isEmergency: false,
  },
  {
    id: 'diag-electrolytes',
    name: 'Serum Electrolytes (Na+, K+, Cl-) & Renal Function',
    category: 'PATHOLOGY',
    description: 'Critical electrolyte balance, blood urea, and creatinine for emergency resuscitation.',
    turnaroundTime: '30 mins',
    price: 650,
    isEmergency: true,
  },
  {
    id: 'diag-lipid-profile',
    name: 'Comprehensive Lipid Profile (Cholesterol Panel)',
    category: 'CARDIOLOGY',
    description: 'Total cholesterol, HDL, LDL, VLDL, triglycerides for cardiovascular risk profile.',
    turnaroundTime: '2 hours',
    price: 700,
    isEmergency: false,
    fastingRequired: true,
  },
  {
    id: 'diag-usg-fast',
    name: 'FAST Scan / Emergency Abdominal Ultrasound',
    category: 'RADIOLOGY',
    description: 'Focused Assessment with Sonography in Trauma to detect internal abdominal bleeding.',
    turnaroundTime: '15 mins (Emergency)',
    price: 1200,
    isEmergency: true,
  },
];

// In-Memory Fallback & Seed Store
class InMemoryDiagnosticStore {
  private bookings: Map<string, DiagnosticBooking> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    const today = new Date().toISOString().split('T')[0];

    const seedItems: DiagnosticBooking[] = [
      {
        id: 'book-seed-1',
        patientUid: 'user-patient-1',
        patientName: 'Ramesh Kumar',
        patientPhone: '+91-98765-43210',
        crisisId: 'CRISIS-9921',
        facilityId: 'hosp-martha-blr',
        facilityName: "St. Martha's Hospital ER",
        testName: 'Troponin-I Rapid Quantitative (Cardiac Biomarker)',
        category: 'CARDIOLOGY',
        prescribedByDoctorId: 'doc-sharma-trauma',
        prescribedByDoctorName: 'Dr. Rajesh Sharma',
        scheduledDate: today,
        slotTime: '10:30 AM',
        status: 'REQUESTED',
        price: 850,
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'book-seed-2',
        patientUid: 'user-patient-2',
        patientName: 'Priya Sundaram',
        patientPhone: '+91-98111-22334',
        crisisId: 'CRISIS-9924',
        facilityId: 'hosp-martha-blr',
        facilityName: "St. Martha's Hospital ER",
        testName: '12-Lead Emergency ECG with Rhythm Strip',
        category: 'CARDIOLOGY',
        scheduledDate: today,
        slotTime: '11:15 AM',
        status: 'SAMPLE_COLLECTED',
        price: 350,
        createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: 'book-seed-3',
        patientUid: 'user-patient-3',
        patientName: 'Amit Patel',
        patientPhone: '+91-97234-56789',
        crisisId: 'CRISIS-9918',
        facilityId: 'hosp-martha-blr',
        facilityName: "St. Martha's Hospital ER",
        testName: 'Complete Blood Count (CBC) with Platelets & ESR',
        category: 'PATHOLOGY',
        scheduledDate: today,
        slotTime: '09:00 AM',
        status: 'REPORT_READY',
        reportUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        reportSummary: 'WBC slightly elevated (11,400/uL). Platelet count normal (240,000/uL). Hb 13.8 g/dL.',
        price: 320,
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: 'book-seed-4',
        patientUid: 'user-patient-1',
        patientName: 'Ramesh Kumar',
        patientPhone: '+91-98765-43210',
        crisisId: 'CRISIS-9921',
        facilityId: 'hosp-fortis-blr',
        facilityName: 'Fortis Hospital Pharmacy & ER',
        testName: 'CT Scan Brain (Non-Contrast Trauma Protocol)',
        category: 'RADIOLOGY',
        scheduledDate: today,
        slotTime: '01:00 PM',
        status: 'CONFIRMED',
        price: 2400,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ];

    for (const b of seedItems) {
      this.bookings.set(b.id, b);
    }
  }

  getAll(): DiagnosticBooking[] {
    return Array.from(this.bookings.values());
  }

  getByFacility(facilityId: string): DiagnosticBooking[] {
    return Array.from(this.bookings.values()).filter(
      (b) => b.facilityId === facilityId || b.facilityId === `hosp-${facilityId}`
    );
  }

  getByPatient(patientUid: string): DiagnosticBooking[] {
    return Array.from(this.bookings.values()).filter((b) => b.patientUid === patientUid);
  }

  getById(id: string): DiagnosticBooking | undefined {
    return this.bookings.get(id);
  }

  set(b: DiagnosticBooking): void {
    this.bookings.set(b.id, b);
  }
}

const localStore = new InMemoryDiagnosticStore();

export class DiagnosticService {
  /**
   * Get diagnostic catalog
   */
  getCatalog(): DiagnosticCatalogItem[] {
    return DIAGNOSTIC_CATALOG;
  }

  /**
   * Book a diagnostic test
   */
  async bookTest(data: {
    patientUid: string;
    patientName: string;
    patientPhone?: string;
    crisisId?: string;
    facilityId: string;
    facilityName?: string;
    testName: string;
    category?: 'PATHOLOGY' | 'RADIOLOGY' | 'CARDIOLOGY';
    prescribedByDoctorId?: string;
    prescribedByDoctorName?: string;
    scheduledDate: string;
    slotTime: string;
    price?: number;
  }): Promise<DiagnosticBooking> {
    if (!data.patientName || !data.testName || !data.facilityId || !data.scheduledDate || !data.slotTime) {
      throw new AppError(
        400,
        'INVALID_INPUT',
        'Patient name, test name, facility ID, scheduled date, and slot time are required.'
      );
    }

    const bookingId = `diag-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const catalogItem = DIAGNOSTIC_CATALOG.find(
      (c) => c.name.toLowerCase() === data.testName.toLowerCase() || c.id === data.testName
    );

    const category = data.category || catalogItem?.category || 'PATHOLOGY';
    const price = data.price ?? catalogItem?.price ?? 500;

    const booking: DiagnosticBooking = {
      id: bookingId,
      patientUid: data.patientUid,
      patientName: data.patientName,
      patientPhone: data.patientPhone || '',
      crisisId: data.crisisId || `CRISIS-${Math.floor(1000 + Math.random() * 9000)}`,
      facilityId: data.facilityId,
      facilityName: data.facilityName || "Hospital Emergency Lab",
      testName: catalogItem?.name || data.testName,
      category,
      prescribedByDoctorId: data.prescribedByDoctorId,
      prescribedByDoctorName: data.prescribedByDoctorName,
      scheduledDate: data.scheduledDate,
      slotTime: data.slotTime,
      status: 'REQUESTED',
      price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (firestore) {
      try {
        await firestore.collection('diagnosticBookings').doc(bookingId).set(booking);
      } catch (_err) {
        // Continue with local store
      }
    }

    localStore.set(booking);
    return booking;
  }

  /**
   * Get queue of diagnostic test bookings for a hospital lab desk
   */
  async getFacilityRequests(facilityId: string): Promise<DiagnosticBooking[]> {
    if (firestore) {
      try {
        const snapshot = await firestore
          .collection('diagnosticBookings')
          .where('facilityId', 'in', [facilityId, `hosp-${facilityId}`])
          .get();

        if (!snapshot.empty) {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<DiagnosticBooking, 'id'>),
          }));
          list.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return list;
        }
      } catch (_err) {
        // fallback
      }
    }

    // Local fallback
    const items = localStore.getByFacility(facilityId);
    if (items.length > 0) {
      return items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Return general list mapped to this facility if none exist specifically
    return localStore.getAll().map((b) => ({
      ...b,
      facilityId,
    }));
  }

  /**
   * Hospital or Lab Technician uploads report or enters findings
   */
  async uploadReport(
    bookingId: string,
    data: {
      reportUrl?: string;
      reportSummary: string;
      status?: 'REPORT_READY' | 'SAMPLE_COLLECTED' | 'CONFIRMED';
    }
  ): Promise<DiagnosticBooking> {
    let booking = localStore.getById(bookingId);

    if (firestore) {
      try {
        const docRef = firestore.collection('diagnosticBookings').doc(bookingId);
        const doc = await docRef.get();
        if (doc.exists) {
          booking = { id: doc.id, ...(doc.data() as Omit<DiagnosticBooking, 'id'>) };
        }
      } catch (_err) {
        // fallback
      }
    }

    if (!booking) {
      booking = localStore.getAll().find((b) => b.id === bookingId);
    }

    if (!booking) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', `Diagnostic booking ${bookingId} not found.`);
    }

    const updated: DiagnosticBooking = {
      ...booking,
      reportUrl: data.reportUrl || booking.reportUrl || null,
      reportSummary: data.reportSummary || booking.reportSummary || null,
      status: data.status || 'REPORT_READY',
      updatedAt: new Date().toISOString(),
    };

    if (firestore) {
      try {
        await firestore
          .collection('diagnosticBookings')
          .doc(bookingId)
          .set(updated, { merge: true });
      } catch (_err) {
        // fallback
      }
    }

    localStore.set(updated);
    return updated;
  }

  /**
   * Get all test bookings and reports for a patient
   */
  async getPatientBookings(patientUid: string): Promise<DiagnosticBooking[]> {
    if (firestore) {
      try {
        const snapshot = await firestore
          .collection('diagnosticBookings')
          .where('patientUid', '==', patientUid)
          .get();

        if (!snapshot.empty) {
          return snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<DiagnosticBooking, 'id'>),
            }))
            .sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      } catch (_err) {
        // fallback
      }
    }

    const list = localStore.getByPatient(patientUid);
    if (list.length > 0) {
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Return sample user bookings
    return localStore.getAll().slice(0, 3);
  }

  /**
   * Count pending diagnostic requests for a facility
   */
  async countPendingLabTests(facilityId: string): Promise<number> {
    const list = await this.getFacilityRequests(facilityId);
    return list.filter(
      (b) =>
        b.status === 'REQUESTED' ||
        b.status === 'CONFIRMED' ||
        b.status === 'SAMPLE_COLLECTED'
    ).length;
  }
}

export const diagnosticService = new DiagnosticService();

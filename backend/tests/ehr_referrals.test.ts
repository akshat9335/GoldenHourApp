import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/config/firebase', () => ({
  auth: {
    verifyIdToken: vi.fn(),
  },
  firestore: null,
  assertFirebaseReady: vi.fn(),
}));

import { createApp } from '../src/app';
import { auth } from '../src/config/firebase';
import { dataStore } from '../src/models/dataStore';

const app = createApp();
const mockVerifyIdToken = vi.mocked(auth!.verifyIdToken);

describe('EHR & Referral Tracking API', () => {
  beforeEach(() => {
    dataStore.reset();
    vi.clearAllMocks();
  });

  describe('Health Records (/api/records)', () => {
    it('creates a health record with FHIR R4 Bundle', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'doc-user-001',
        email: 'doctor@gh.org',
        role: 'DOCTOR',
      } as any);

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', 'Bearer fake-doctor-token')
        .send({
          patientUid: 'patient-test-01',
          crisisId: 'AS-4232',
          recordType: 'PRESCRIPTION',
          title: 'Post-Trauma Prescription & Stabilization',
          facilityName: 'Apex Trauma Center',
          doctorName: 'Dr. Rajesh Sharma',
          doctorSpecialty: 'Trauma Surgery',
          diagnosis: 'Acute Blunt Chest Trauma with Contusion',
          date: '2026-09-22T08:00:00Z',
          allergies: ['Penicillin', 'Sulfa drugs'],
          medications: [
            {
              name: 'Tramadol',
              dosage: '50mg',
              frequency: 'Every 8 hours',
              duration: '5 days',
            },
            {
              name: 'Pantoprazole',
              dosage: '40mg',
              frequency: 'Once daily',
              duration: '7 days',
            },
          ],
          labResults: [
            {
              testName: 'Blood Oxygen (SpO2)',
              value: '98',
              normalRange: '95 - 100',
              unit: '%',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.recordType).toBe('PRESCRIPTION');
      expect(res.body.data.fhirBundle).toBeDefined();
      expect(res.body.data.fhirBundle.resourceType).toBe('Bundle');
      expect(res.body.data.fhirBundle.type).toBe('document');
      expect(res.body.data.fhirBundle.entry[0].resource.resourceType).toBe('Composition');
    });

    it('returns patient timeline sorted reverse-chronologically', async () => {
      // Add two records
      await request(app)
        .post('/api/records')
        .set('Authorization', 'Bearer fake-doctor-token')
        .send({
          patientUid: 'patient-test-timeline',
          recordType: 'DIAGNOSIS',
          title: 'Initial ER Admission',
          date: '2026-09-20T10:00:00Z',
        });

      await request(app)
        .post('/api/records')
        .set('Authorization', 'Bearer fake-doctor-token')
        .send({
          patientUid: 'patient-test-timeline',
          recordType: 'LAB_REPORT',
          title: 'Follow-up Complete Blood Count',
          date: '2026-09-21T14:00:00Z',
        });

      const res = await request(app).get('/api/records/patient/patient-test-timeline');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      // More recent date first
      expect(res.body.data[0].title).toBe('Follow-up Complete Blood Count');
      expect(res.body.data[1].title).toBe('Initial ER Admission');
    });

    it('returns fast Emergency Summary with allergies and active meds', async () => {
      await request(app)
        .post('/api/records')
        .set('Authorization', 'Bearer fake-doctor-token')
        .send({
          patientUid: 'patient-sos-01',
          recordType: 'PRESCRIPTION',
          title: 'Cardio Meds',
          allergies: ['Aspirin'],
          medications: [
            {
              name: 'Atorvastatin',
              dosage: '20mg',
              frequency: 'Bedtime',
              duration: '30 days',
            },
          ],
        });

      const res = await request(app).get('/api/records/summary/patient-sos-01');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeAllergies).toContain('Aspirin');
      expect(res.body.data.currentMedications).toHaveLength(1);
      expect(res.body.data.currentMedications[0].name).toBe('Atorvastatin');
    });

    it('exports raw FHIR R4 Bundle for record', async () => {
      const created = await request(app)
        .post('/api/records')
        .set('Authorization', 'Bearer fake-doctor-token')
        .send({
          patientUid: 'patient-fhir-01',
          recordType: 'LAB_REPORT',
          title: 'Arterial Blood Gas',
          labResults: [
            {
              testName: 'pH',
              value: '7.38',
              normalRange: '7.35-7.45',
              unit: 'pH units',
            },
          ],
        });

      const recordId = created.body.data.id;
      const res = await request(app).get(`/api/records/${recordId}/fhir`);

      expect(res.status).toBe(200);
      expect(res.body.resourceType).toBe('Bundle');
      expect(res.body.type).toBe('document');
      expect(res.body.entry.length).toBeGreaterThan(0);
    });
  });

  describe('Referral Tracking (/api/referrals)', () => {
    it('allows doctor to create a referral with priority', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'doc-user-001',
        email: 'doctor@gh.org',
        role: 'DOCTOR',
        roles: ['DOCTOR'],
      } as any);

      const res = await request(app)
        .post('/api/referrals')
        .set('Authorization', 'Bearer doctor-token')
        .send({
          patientUid: 'patient-ref-01',
          patientName: 'Aarav Patel',
          patientPhone: '+919876543210',
          crisisId: 'AS-4232',
          targetHospitalId: 'hospital-apollo-01',
          targetHospitalName: 'Apollo Speciality Hospital',
          targetDepartment: 'Cardiology & Cath Lab',
          priority: 'EMERGENCY',
          reasonForReferral: 'Acute Coronary Syndrome requiring immediate PCI',
          clinicalNotes: 'ST-elevation observed on lead II, III, aVF. Dual antiplatelets administered.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('CREATED');
      expect(res.body.data.priority).toBe('EMERGENCY');
    });

    it('hospital views incoming referrals ordered by priority', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'hospital-user-01',
        email: 'hospital@apollo.org',
        role: 'HOSPITAL',
        roles: ['HOSPITAL'],
      } as any);

      // Create a routine referral and an emergency referral
      dataStore.referrals.set('ref-routine', {
        id: 'ref-routine',
        patientUid: 'pat-1',
        patientName: 'Routine Patient',
        patientPhone: '123',
        crisisId: 'GH-1001',
        referringDoctorId: 'doc-1',
        referringDoctorName: 'Dr. One',
        referringFacilityName: 'Clinic 1',
        targetHospitalId: 'hosp-target',
        targetHospitalName: 'Target Hospital',
        targetDepartment: 'General OPD',
        priority: 'ROUTINE',
        reasonForReferral: 'Checkup',
        clinicalNotes: '',
        status: 'CREATED',
        createdAt: '2026-09-22T01:00:00Z',
        updatedAt: '2026-09-22T01:00:00Z',
      });

      dataStore.referrals.set('ref-emergency', {
        id: 'ref-emergency',
        patientUid: 'pat-2',
        patientName: 'Emergency Patient',
        patientPhone: '456',
        crisisId: 'GH-1002',
        referringDoctorId: 'doc-2',
        referringDoctorName: 'Dr. Two',
        referringFacilityName: 'Clinic 2',
        targetHospitalId: 'hosp-target',
        targetHospitalName: 'Target Hospital',
        targetDepartment: 'Trauma ICU',
        priority: 'EMERGENCY',
        reasonForReferral: 'Severe polytrauma',
        clinicalNotes: '',
        status: 'CREATED',
        createdAt: '2026-09-22T02:00:00Z',
        updatedAt: '2026-09-22T02:00:00Z',
      });

      const res = await request(app)
        .get('/api/referrals/hospital/incoming?hospitalId=hosp-target')
        .set('Authorization', 'Bearer hospital-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].id).toBe('ref-emergency');
      expect(res.body.data[0].priority).toBe('EMERGENCY');
      expect(res.body.data[1].id).toBe('ref-routine');
    });

    it('hospital updates referral status to HOSPITAL_ACCEPTED', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'hospital-user-01',
        role: 'HOSPITAL',
      } as any);

      dataStore.referrals.set('ref-accept-test', {
        id: 'ref-accept-test',
        patientUid: 'pat-accept',
        patientName: 'Accept Patient',
        patientPhone: '123',
        crisisId: 'GH-2001',
        referringDoctorId: 'doc-1',
        referringDoctorName: 'Dr. One',
        referringFacilityName: 'Clinic 1',
        targetHospitalId: 'hospital-user-01',
        targetHospitalName: 'Target Hospital',
        targetDepartment: 'ICU',
        priority: 'EMERGENCY',
        reasonForReferral: 'ICU needed',
        clinicalNotes: '',
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .patch('/api/referrals/ref-accept-test/status')
        .set('Authorization', 'Bearer hospital-token')
        .send({
          status: 'HOSPITAL_ACCEPTED',
          notes: 'Bed reserved in ICU Unit B-4. Cath lab on standby.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('HOSPITAL_ACCEPTED');
      expect(res.body.data.hospitalNotes).toContain('Bed reserved');
    });

    it('patient tracks their own referral progression', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'patient-self-01',
        role: 'PATIENT',
      } as any);

      dataStore.referrals.set('ref-pat-me', {
        id: 'ref-pat-me',
        patientUid: 'patient-self-01',
        patientName: 'Self Patient',
        patientPhone: '999',
        crisisId: 'GH-3001',
        referringDoctorId: 'doc-1',
        referringDoctorName: 'Dr. Self',
        referringFacilityName: 'Clinic Self',
        targetHospitalId: 'hosp-1',
        targetHospitalName: 'Metro Hospital',
        targetDepartment: 'Surgery',
        priority: 'URGENT',
        reasonForReferral: 'Appendectomy',
        clinicalNotes: '',
        status: 'PATIENT_ARRIVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/referrals/patient/me')
        .set('Authorization', 'Bearer patient-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('PATIENT_ARRIVED');
    });
  });
});

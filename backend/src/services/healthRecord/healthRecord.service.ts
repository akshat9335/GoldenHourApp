import { firestore } from '../../config/firebase';
import { dataStore } from '../../models/dataStore';
import { HealthRecord, EmergencyHealthSummary, HealthRecordType, MedicationItem } from '../../models/healthRecord.model';
import { buildFhirR4Bundle } from '../../utils/fhirBuilder';
import { getUserProfile } from '../users/user.service';
import { AppError } from '../../utils/AppError';

export class HealthRecordService {
  /**
   * Create a new health record for a patient.
   * Automatically builds and attaches an ABDM/FHIR R4 Bundle.
   */
  public async createRecord(
    input: Partial<HealthRecord> & {
      patientUid: string;
      recordType: HealthRecordType;
      title: string;
      facilityName?: string;
    }
  ): Promise<HealthRecord> {
    if (!input.patientUid) {
      throw new AppError(400, 'MISSING_PATIENT_UID', 'Patient UID is required to create a health record.');
    }
    if (!input.title) {
      throw new AppError(400, 'MISSING_TITLE', 'Record title is required.');
    }
    if (!input.recordType) {
      throw new AppError(400, 'MISSING_RECORD_TYPE', 'Record type is required.');
    }

    const now = new Date().toISOString();
    const recordId = input.id || `rec-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve patient crisisId if not explicitly provided
    let crisisId = input.crisisId;
    if (!crisisId) {
      try {
        const profile = await getUserProfile(input.patientUid);
        crisisId = profile?.crisisId || `GH-${input.patientUid.slice(0, 4).toUpperCase()}`;
      } catch {
        crisisId = `GH-${input.patientUid.slice(0, 4).toUpperCase()}`;
      }
    }

    const record: HealthRecord = {
      id: recordId,
      patientUid: input.patientUid,
      crisisId,
      recordType: input.recordType,
      title: input.title,
      facilityName: input.facilityName || 'Golden Hour Medical Network',
      doctorName: input.doctorName,
      doctorSpecialty: input.doctorSpecialty,
      diagnosis: input.diagnosis,
      date: input.date || now,
      allergies: Array.isArray(input.allergies) ? input.allergies : [],
      medications: Array.isArray(input.medications) ? input.medications : [],
      labResults: Array.isArray(input.labResults) ? input.labResults : [],
      attachmentUrl: input.attachmentUrl || null,
      createdAt: now,
      updatedAt: now,
    };

    // Automatically build ABDM FHIR R4 Bundle
    record.fhirBundle = buildFhirR4Bundle(record);

    // Persist in-memory fallback
    dataStore.healthRecords.set(record.id, record);

    // Persist to Firestore: healthRecords/{patientUid}/records/{recordId}
    if (firestore) {
      try {
        await firestore
          .collection('healthRecords')
          .doc(input.patientUid)
          .collection('records')
          .doc(record.id)
          .set(record);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[HealthRecordService] Firestore write failed:', err);
      }
    }

    return record;
  }

  /**
   * Get patient's longitudinal timeline in reverse-chronological order.
   */
  public async getPatientTimeline(patientUid: string): Promise<HealthRecord[]> {
    if (!patientUid) {
      throw new AppError(400, 'MISSING_PATIENT_UID', 'Patient UID is required.');
    }

    const records: HealthRecord[] = [];

    if (firestore) {
      try {
        const snap = await firestore
          .collection('healthRecords')
          .doc(patientUid)
          .collection('records')
          .orderBy('date', 'desc')
          .get();

        snap.docs.forEach((doc) => {
          records.push({ id: doc.id, ...(doc.data() as Omit<HealthRecord, 'id'>) });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[HealthRecordService] Firestore query error, falling back to memory:', err);
      }
    }

    // Include/fallback in-memory store records matching this patient
    if (records.length === 0) {
      for (const rec of dataStore.healthRecords.values()) {
        if (rec.patientUid === patientUid) {
          records.push(rec);
        }
      }
    }

    // Sort reverse-chronologically by date / createdAt
    return records.sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt).getTime();
      const timeB = new Date(b.date || b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Ultra-fast Emergency Summary for SOS situations (Ambulance / Emergency Dept).
   * Aggregates active allergies, blood group, and current medications in sub-second response.
   */
  public async getEmergencySummary(patientUid: string): Promise<EmergencyHealthSummary> {
    if (!patientUid) {
      throw new AppError(400, 'MISSING_PATIENT_UID', 'Patient UID is required.');
    }

    // 1. Fetch user profile for persistent baseline data (bloodGroup, chronic conditions)
    let profile = null;
    try {
      profile = await getUserProfile(patientUid);
    } catch {
      // ignore
    }

    // 2. Fetch timeline records to collect allergies and active medications
    const records = await this.getPatientTimeline(patientUid);

    const allergySet = new Set<string>();
    const medicationMap = new Map<string, MedicationItem>();

    // Add baseline allergies from user profile if any
    if (profile?.allergies) {
      const list = Array.isArray(profile.allergies)
        ? profile.allergies
        : String(profile.allergies).split(',').map((s) => s.trim());
      list.filter(Boolean).forEach((a: string) => allergySet.add(a));
    }

    // Add baseline medications from user profile if any
    if (profile?.medications) {
      const list = Array.isArray(profile.medications)
        ? profile.medications
        : String(profile.medications).split(',').map((s) => s.trim());
      list.filter(Boolean).forEach((m: string) => {
        medicationMap.set(m.toLowerCase(), {
          name: m,
          dosage: 'As prescribed',
          frequency: 'Daily',
          duration: 'Ongoing',
        });
      });
    }

    // Traverse records
    for (const rec of records) {
      if (rec.allergies && Array.isArray(rec.allergies)) {
        rec.allergies.forEach((a) => allergySet.add(a));
      }
      if (rec.medications && Array.isArray(rec.medications)) {
        rec.medications.forEach((med) => {
          if (!medicationMap.has(med.name.toLowerCase())) {
            medicationMap.set(med.name.toLowerCase(), med);
          }
        });
      }
    }

    const chronicList: string[] = [];
    if (profile?.chronicConditions) {
      if (Array.isArray(profile.chronicConditions)) {
        chronicList.push(...profile.chronicConditions);
      } else {
        chronicList.push(...String(profile.chronicConditions).split(',').map((s) => s.trim()).filter(Boolean));
      }
    }

    return {
      patientUid,
      crisisId: profile?.crisisId || (records[0]?.crisisId ?? `GH-${patientUid.slice(0, 4).toUpperCase()}`),
      bloodGroup: profile?.bloodGroup || 'Not specified',
      activeAllergies: Array.from(allergySet),
      currentMedications: Array.from(medicationMap.values()),
      chronicConditions: chronicList,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Retrieve FHIR R4 Bundle for a single record.
   */
  public async getFhirBundle(recordId: string, patientUid?: string): Promise<Record<string, any>> {
    let record: HealthRecord | undefined;

    // Check in-memory store
    if (dataStore.healthRecords.has(recordId)) {
      record = dataStore.healthRecords.get(recordId);
    }

    // Check Firestore
    if (!record && firestore) {
      try {
        if (patientUid) {
          const docSnap = await firestore
            .collection('healthRecords')
            .doc(patientUid)
            .collection('records')
            .doc(recordId)
            .get();
          if (docSnap.exists) {
            record = { id: docSnap.id, ...(docSnap.data() as Omit<HealthRecord, 'id'>) };
          }
        } else {
          const groupSnap = await firestore
            .collectionGroup('records')
            .where('id', '==', recordId)
            .limit(1)
            .get();
          if (!groupSnap.empty) {
            const first = groupSnap.docs[0];
            record = { id: first.id, ...(first.data() as Omit<HealthRecord, 'id'>) };
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[HealthRecordService] Error fetching single record:', err);
      }
    }

    if (!record) {
      throw new AppError(404, 'RECORD_NOT_FOUND', `Health record ${recordId} was not found.`);
    }

    if (!record.fhirBundle) {
      record.fhirBundle = buildFhirR4Bundle(record);
    }

    return record.fhirBundle;
  }
}

export const healthRecordService = new HealthRecordService();

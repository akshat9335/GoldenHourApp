import { firestore } from "../../config/firebase";
import { HealthRecord, CreateHealthRecordRequest } from "../../types/healthRecord";
import { AppError } from "../../utils/AppError";
import { referralService } from "../referral/referral.service";
import { appointmentService } from "../doctor/appointment.service";

class HealthRecordService {
  private inMemoryRecords: Map<string, HealthRecord> = new Map();

  public async createRecord(data: CreateHealthRecordRequest): Promise<HealthRecord> {
    if (!data.patientId || !data.doctorId || !data.diagnosis) {
      throw new AppError(400, "MISSING_FIELDS", "patientId, doctorId, and diagnosis are required.");
    }

    const id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    let createdReferralId: string | undefined;

    // If referral is requested, create real referral
    if (data.referral && data.referral.hospitalId) {
      try {
        const ref = await referralService.createReferral({
          patientId: data.patientId,
          patientName: data.patientName || "Patient",
          doctorId: data.doctorId,
          doctorName: data.doctorName || "Treating Doctor",
          hospitalId: data.referral.hospitalId,
          hospitalName: data.referral.hospitalName || "Referral Hospital",
          reason: data.referral.reason || data.diagnosis,
          priority: data.referral.priority || "NORMAL",
        });
        createdReferralId = ref.id;
      } catch (err) {
        console.warn("[HealthRecordService] Failed to auto-create referral:", err);
      }
    }

    const record: HealthRecord = {
      id,
      patientId: data.patientId,
      patientName: data.patientName || "Patient",
      doctorId: data.doctorId,
      doctorName: data.doctorName || "Doctor",
      doctorSpecialty: data.doctorSpecialty || "Specialist",
      clinicName: data.clinicName || "Golden Hour Medical Center",
      appointmentId: data.appointmentId,
      tokenNumber: data.tokenNumber,
      diagnosis: data.diagnosis,
      notes: data.notes || "",
      vitals: data.vitals || {
        bloodPressure: "120/80",
        heartRate: 72,
        temperature: "98.4 F",
        spO2: 99,
      },
      prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
      referralId: createdReferralId,
      createdAt: now,
      updatedAt: now,
    };

    this.inMemoryRecords.set(id, record);

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("healthRecords").doc(id).set(record);
      } catch (err) {
        console.warn("[HealthRecordService] Failed to persist health record:", err);
      }
    }

    // Complete appointment if appointmentId is present
    if (data.appointmentId) {
      try {
        await appointmentService.completeConsultation(data.appointmentId);
      } catch {}
    }

    return record;
  }

  public async getRecordsByPatient(patientId: string): Promise<HealthRecord[]> {
    const results: HealthRecord[] = [];

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        const snap = await firestore
          .collection("healthRecords")
          .where("patientId", "==", patientId)
          .get();

        for (const doc of snap.docs) {
          const item = doc.data() as HealthRecord;
          if (item && item.id) {
            this.inMemoryRecords.set(item.id, item);
          }
        }
      } catch (err) {
        console.warn("[HealthRecordService] Firestore query error:", err);
      }
    }

    for (const record of this.inMemoryRecords.values()) {
      if (record.patientId === patientId) {
        results.push(record);
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getRecordById(id: string): Promise<HealthRecord | null> {
    if (this.inMemoryRecords.has(id)) {
      return this.inMemoryRecords.get(id)!;
    }

    if (firestore) {
      try {
        const snap = await firestore.collection("healthRecords").doc(id).get();
        if (snap.exists) {
          const r = snap.data() as HealthRecord;
          this.inMemoryRecords.set(id, r);
          return r;
        }
      } catch {}
    }

    return null;
  }
}

export const healthRecordService = new HealthRecordService();

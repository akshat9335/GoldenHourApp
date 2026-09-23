import { firestore } from "../../config/firebase";
import { DoctorReferral, CreateReferralRequest, ReferralStatus } from "../../types/referral";
import { AppError } from "../../utils/AppError";

class ReferralService {
  private inMemoryReferrals: Map<string, DoctorReferral> = new Map();

  public async createReferral(data: CreateReferralRequest): Promise<DoctorReferral> {
    if (!data.patientId || !data.doctorId || !data.hospitalId || !data.reason) {
      throw new AppError(400, "MISSING_FIELDS", "patientId, doctorId, hospitalId, and reason are required.");
    }

    const id = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const referral: DoctorReferral = {
      id,
      patientId: data.patientId,
      patientName: data.patientName || "Patient",
      doctorId: data.doctorId,
      doctorName: data.doctorName || "Treating Doctor",
      hospitalId: data.hospitalId,
      hospitalName: data.hospitalName || "Referral Hospital",
      reason: data.reason,
      priority: data.priority || "NORMAL",
      status: "PENDING",
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    this.inMemoryReferrals.set(id, referral);

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("referrals").doc(id).set(referral);
      } catch (err) {
        console.warn("[ReferralService] Failed to persist to Firestore:", err);
      }
    }

    return referral;
  }

  public async getReferralsByHospital(hospitalId: string): Promise<DoctorReferral[]> {
    const results: DoctorReferral[] = [];

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        const snap = await firestore
          .collection("referrals")
          .where("hospitalId", "==", hospitalId)
          .get();

        for (const doc of snap.docs) {
          const item = doc.data() as DoctorReferral;
          if (item && item.id) {
            this.inMemoryReferrals.set(item.id, item);
          }
        }
      } catch (err) {
        console.warn("[ReferralService] Firestore fetch error:", err);
      }
    }

    for (const ref of this.inMemoryReferrals.values()) {
      if (ref.hospitalId === hospitalId || hospitalId === "all" || ref.hospitalId.includes(hospitalId) || hospitalId.includes(ref.hospitalId)) {
        results.push(ref);
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getReferralsByPatient(patientId: string): Promise<DoctorReferral[]> {
    const results: DoctorReferral[] = [];

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        const snap = await firestore
          .collection("referrals")
          .where("patientId", "==", patientId)
          .get();

        for (const doc of snap.docs) {
          const item = doc.data() as DoctorReferral;
          if (item && item.id) {
            this.inMemoryReferrals.set(item.id, item);
          }
        }
      } catch (err) {
        console.warn("[ReferralService] Firestore fetch error:", err);
      }
    }

    for (const ref of this.inMemoryReferrals.values()) {
      if (ref.patientId === patientId) {
        results.push(ref);
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async updateReferralStatus(referralId: string, status: ReferralStatus): Promise<DoctorReferral> {
    let referral = this.inMemoryReferrals.get(referralId);

    if (!referral && firestore) {
      try {
        const snap = await firestore.collection("referrals").doc(referralId).get();
        if (snap.exists) {
          referral = snap.data() as DoctorReferral;
        }
      } catch {}
    }

    if (!referral) {
      throw new AppError(404, "REFERRAL_NOT_FOUND", `Referral '${referralId}' not found.`);
    }

    referral.status = status;
    referral.updatedAt = new Date().toISOString();
    this.inMemoryReferrals.set(referralId, referral);

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("referrals").doc(referralId).update({
          status,
          updatedAt: referral.updatedAt,
        });
      } catch (err) {
        console.warn("[ReferralService] Firestore update error:", err);
      }
    }

    return referral;
  }
}

export const referralService = new ReferralService();

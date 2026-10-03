import { firestore } from "../../config/firebase";
import { DoctorReferral, CreateReferralRequest, ReferralStatus } from "../../types/referral";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";

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

    // 1. Fetch Doctor-to-Hospital referrals
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

    // 2. Fetch ASHA / Frontline Worker referrals (communityReferrals)
    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        const commSnap = await firestore.collection("communityReferrals").get();
        for (const doc of commSnap.docs) {
          const item = doc.data() as any;
          if (item && item.id) {
            const isMatch =
              hospitalId === "all" ||
              item.hospitalId === hospitalId ||
              (item.hospitalId && (item.hospitalId.includes(hospitalId) || hospitalId.includes(item.hospitalId))) ||
              (item.destinationFacility && (
                item.destinationFacility.toLowerCase().includes(hospitalId.toLowerCase()) ||
                hospitalId.toLowerCase().includes(item.destinationFacility.toLowerCase())
              ));

            if (isMatch) {
              const mapped: DoctorReferral = {
                id: item.id,
                patientId: item.patientId,
                patientName: item.patientName || "Community Patient",
                doctorId: item.workerUid || "asha-worker",
                doctorName: item.workerName || "ASHA Frontline Worker",
                hospitalId: item.hospitalId || hospitalId,
                hospitalName: item.destinationFacility || "District Hospital",
                reason: item.reason || "Rural community health referral",
                priority: (item.priority === "CRITICAL" || item.priority === "HIGH") ? "HIGH" : "NORMAL",
                status: item.status || "PENDING",
                notes: item.vitalsSnapshot
                  ? `Vitals: BP ${item.vitalsSnapshot.bloodPressure || 'N/A'}, SpO2 ${item.vitalsSnapshot.spO2 || 'N/A'}%, Pulse ${item.vitalsSnapshot.pulse || 'N/A'} bpm${item.vitalsSnapshot.bloodSugar ? `, Sugar ${item.vitalsSnapshot.bloodSugar} mg/dL` : ''}`
                  : (item.notes || ""),
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt || new Date().toISOString(),
              };
              results.push(mapped);
            }
          }
        }
      } catch (err) {
        console.warn("[ReferralService] Firestore communityReferrals fetch error:", err);
      }
    }

    // Check in-memory communityReferrals
    if (dataStore && dataStore.communityReferrals) {
      for (const item of dataStore.communityReferrals.values() as any) {
        if (!results.some((r) => r.id === item.id)) {
          const isMatch =
            hospitalId === "all" ||
            item.hospitalId === hospitalId ||
            (item.hospitalId && (item.hospitalId.includes(hospitalId) || hospitalId.includes(item.hospitalId))) ||
            (item.destinationFacility && (
              item.destinationFacility.toLowerCase().includes(hospitalId.toLowerCase()) ||
              hospitalId.toLowerCase().includes(item.destinationFacility.toLowerCase())
            ));

          if (isMatch) {
            results.push({
              id: item.id,
              patientId: item.patientId,
              patientName: item.patientName || "Community Patient",
              doctorId: item.workerUid || "asha-worker",
              doctorName: item.workerName || "ASHA Frontline Worker",
              hospitalId: item.hospitalId || hospitalId,
              hospitalName: item.destinationFacility || "District Hospital",
              reason: item.reason || "Rural community health referral",
              priority: (item.priority === "CRITICAL" || item.priority === "HIGH") ? "HIGH" : "NORMAL",
              status: item.status || "PENDING",
              notes: item.vitalsSnapshot
                ? `Vitals: BP ${item.vitalsSnapshot.bloodPressure || 'N/A'}, SpO2 ${item.vitalsSnapshot.spO2 || 'N/A'}%, Pulse ${item.vitalsSnapshot.pulse || 'N/A'} bpm`
                : (item.notes || ""),
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
          }
        }
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

    // Also check communityReferrals
    if (!referral && firestore) {
      try {
        const commSnap = await firestore.collection("communityReferrals").doc(referralId).get();
        if (commSnap.exists) {
          const item = commSnap.data() as any;
          referral = {
            id: item.id,
            patientId: item.patientId,
            patientName: item.patientName || "Community Patient",
            doctorId: item.workerUid || "asha-worker",
            doctorName: item.workerName || "ASHA Frontline Worker",
            hospitalId: item.hospitalId || "hospital",
            hospitalName: item.destinationFacility || "District Hospital",
            reason: item.reason || "",
            priority: (item.priority === "CRITICAL" || item.priority === "HIGH") ? "HIGH" : "NORMAL",
            status: item.status || "PENDING",
            notes: item.notes || "",
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          };
          await firestore.collection("communityReferrals").doc(referralId).set({
            status,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch {}
    }

    if (dataStore && dataStore.communityReferrals) {
      const commItem = dataStore.communityReferrals.get(referralId);
      if (commItem) {
        commItem.status = (status === "REJECTED" ? "CANCELLED" : status) as any;
        commItem.updatedAt = new Date().toISOString();
        if (!referral) {
          referral = {
            id: commItem.id,
            patientId: commItem.patientId,
            patientName: commItem.patientName || "Community Patient",
            doctorId: commItem.workerUid || "asha-worker",
            doctorName: commItem.workerName || "ASHA Frontline Worker",
            hospitalId: (commItem as any).hospitalId || "hospital",
            hospitalName: commItem.destinationFacility || "District Hospital",
            reason: commItem.reason || "",
            priority: (commItem.priority === "CRITICAL" || commItem.priority === "HIGH") ? "HIGH" : "NORMAL",
            status: (commItem.status === "CANCELLED" ? "REJECTED" : commItem.status) as ReferralStatus,
            notes: "",
            createdAt: commItem.createdAt || new Date().toISOString(),
            updatedAt: commItem.updatedAt || new Date().toISOString(),
          };
        }
      }
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
        // May already be updated in communityReferrals
      }
    }

    return referral;
  }

  public async dismissReferral(referralId: string): Promise<boolean> {
    this.inMemoryReferrals.delete(referralId);
    if (dataStore && dataStore.communityReferrals) {
      dataStore.communityReferrals.delete(referralId);
    }

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("referrals").doc(referralId).delete();
      } catch {}
      try {
        await firestore.collection("communityReferrals").doc(referralId).delete();
      } catch {}
    }

    return true;
  }
}

export const referralService = new ReferralService();

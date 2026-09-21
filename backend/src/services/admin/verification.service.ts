import { dataStore } from "../../models/dataStore";
import { firestore } from "../../config/firebase";
import { doctorService } from "../doctor/doctor.service";
import { AppError } from "../../utils/AppError";
import { CanonicalRole, VerificationStatus } from "../../types/express";

export type VerifiableRole = "DOCTOR" | "HOSPITAL" | "AMBULANCE_DRIVER" | "FRONTLINE_WORKER";

export interface PendingApplicationItem {
  id: string;
  userId: string;
  role: VerifiableRole;
  name: string;
  email?: string | null;
  phone?: string | null;
  crisisId?: string | null;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  details: {
    specialty?: string | null;
    qualification?: string | null;
    licenseNumber?: string | null;
    clinicName?: string | null;
    clinicAddress?: string | null;
    consultationFee?: number | null;
    hospitalName?: string | null;
    hospitalRegNumber?: string | null;
    driverId?: string | null;
    ambulanceId?: string | null;
    [key: string]: any;
  };
}

export class VerificationService {
  /**
   * Universal list method across all professional roles.
   * Merges in-memory dataStore with Firestore so data survives backend restarts.
   */
  public async listApplications(filters?: {
    role?: VerifiableRole;
    status?: VerificationStatus;
  }): Promise<PendingApplicationItem[]> {
    const results: PendingApplicationItem[] = [];
    const targetStatus = filters?.status;
    const targetRole = filters?.role;

    // 1. Doctors — merge Firestore doctors collection into dataStore first
    if (!targetRole || targetRole === "DOCTOR") {
      // Hydrate dataStore from Firestore so data survives backend restarts
      if (firestore) {
        try {
          const snapshot = await firestore.collection("doctors").get();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (data && data.doctorId && !dataStore.doctors.has(data.doctorId)) {
              // Only add if not already in memory (respect in-flight writes)
              dataStore.doctors.set(data.doctorId, data);
            }
            // Also hydrate associated user if missing
            if (data?.userId && !dataStore.users.has(data.userId)) {
              // Will be loaded lazily on first getUserProfile call; skip for now
            }
          });
        } catch (err) {
          console.warn("[VerificationService] Firestore doctors hydration failed:", err);
        }
      }

      // Now read from the (hydrated) in-memory store
      for (const doc of dataStore.doctors.values()) {
        // Skip demo/seed doctors and test suite artifacts
        if (
          doc.userId &&
          (doc.userId.startsWith("user-dr-") ||
            doc.userId.startsWith("test-") ||
            doc.doctorId?.startsWith("doc-test-"))
        ) {
          continue;
        }

        const canonicalStatus: VerificationStatus =
          doc.verificationStatus === "VERIFIED" || doc.verificationStatus === "APPROVED"
            ? "APPROVED"
            : doc.verificationStatus === "REJECTED"
            ? "REJECTED"
            : "PENDING";

        if (targetStatus && canonicalStatus !== targetStatus) {
          continue;
        }

        // Try in-memory user first, then Firestore
        let user = dataStore.users.get(doc.userId);
        if (!user && firestore) {
          try {
            const userSnap = await firestore.collection("users").doc(doc.userId).get();
            if (userSnap.exists) {
              user = userSnap.data() as any;
              if (user) dataStore.users.set(doc.userId, user);
            }
          } catch { /* ignore */ }
        }

        results.push({
          id: doc.doctorId,
          userId: doc.userId,
          role: "DOCTOR",
          name: doc.name,
          email: user?.email || null,
          phone: user?.phone || null,
          crisisId: user?.crisisId || null,
          verificationStatus: canonicalStatus,
          submittedAt: doc.createdAt || new Date().toISOString(),
          details: {
            specialty: doc.specialty,
            qualification: doc.qualification,
            licenseNumber: doc.licenseNumber,
            clinicId: doc.clinicId,
            clinicName: user?.clinicName || null,
            clinicAddress: user?.clinicAddress || null,
            consultationFee: doc.consultationFee,
            availability: doc.availability,
          },
        });
      }
    }

    // 2. Hospitals
    if (!targetRole || targetRole === "HOSPITAL") {
      if (firestore) {
        try {
          const snapshot = await firestore.collection("hospitals").get();
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as any;
            if (!data) continue;

            // Skip test artifacts
            if (
              (data.ownerUid && data.ownerUid.startsWith("test-")) ||
              docSnap.id.startsWith("test-") ||
              (data.name && data.name.toLowerCase().includes("test hospital"))
            ) {
              continue;
            }

            const rawStatus = (data.verificationStatus || "PENDING").toUpperCase();
            const canonicalStatus: VerificationStatus =
              rawStatus === "VERIFIED" || rawStatus === "APPROVED"
                ? "APPROVED"
                : rawStatus === "REJECTED"
                ? "REJECTED"
                : "PENDING";

            if (targetStatus && canonicalStatus !== targetStatus) {
              continue;
            }

            // Hydrate owner user profile if available
            let user = data.ownerUid ? dataStore.users.get(data.ownerUid) : null;
            if (!user && data.ownerUid && firestore) {
              try {
                const userSnap = await firestore.collection("users").doc(data.ownerUid).get();
                if (userSnap.exists) {
                  user = userSnap.data() as any;
                  if (user) dataStore.users.set(data.ownerUid, user);
                }
              } catch {}
            }

            let submittedAtIso = new Date().toISOString();
            if (data.createdAt) {
              if (typeof data.createdAt.toDate === "function") {
                submittedAtIso = data.createdAt.toDate().toISOString();
              } else if (typeof data.createdAt === "string") {
                submittedAtIso = data.createdAt;
              }
            }

            results.push({
              id: docSnap.id,
              userId: data.ownerUid || "",
              role: "HOSPITAL",
              name: data.name || "Hospital Facility",
              email: data.email || user?.email || null,
              phone: data.phone || user?.phone || null,
              crisisId: user?.crisisId || null,
              verificationStatus: canonicalStatus,
              submittedAt: submittedAtIso,
              details: {
                registrationNumber: data.registrationNumber || null,
                address: data.address || user?.clinicAddress || null,
                hospitalType: data.hospitalType || "Multi-Specialty",
                emergencyCapability: data.emergencyCapability || [],
                facilities: data.facilities || [],
                totalBeds: data.totalBeds || 20,
                icuBeds: data.icuBeds || 5,
              },
            });
          }
        } catch (err) {
          console.warn("[VerificationService] Firestore hospitals hydration failed:", err);
        }
      }
    }

    // 3. Ambulance Drivers
    if (!targetRole || targetRole === "AMBULANCE_DRIVER") {
      if (firestore) {
        try {
          const snapshot = await firestore.collection("drivers").get();
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as any;
            if (!data) continue;

            // Skip test artifacts
            if (
              (data.uid && data.uid.startsWith("test-")) ||
              docSnap.id.startsWith("test-") ||
              (data.name && data.name.toLowerCase().includes("test driver"))
            ) {
              continue;
            }

            const rawStatus = (data.verificationStatus || "PENDING").toUpperCase();
            const canonicalStatus: VerificationStatus =
              rawStatus === "VERIFIED" || rawStatus === "APPROVED"
                ? "APPROVED"
                : rawStatus === "REJECTED"
                ? "REJECTED"
                : "PENDING";

            if (targetStatus && canonicalStatus !== targetStatus) {
              continue;
            }

            const ownerUid = data.uid || docSnap.id;
            let user = dataStore.users.get(ownerUid);
            if (!user && ownerUid && firestore) {
              try {
                const userSnap = await firestore.collection("users").doc(ownerUid).get();
                if (userSnap.exists) {
                  user = userSnap.data() as any;
                  if (user) dataStore.users.set(ownerUid, user);
                }
              } catch {}
            }

            let submittedAtIso = new Date().toISOString();
            if (data.createdAt) {
              if (typeof data.createdAt.toDate === "function") {
                submittedAtIso = data.createdAt.toDate().toISOString();
              } else if (typeof data.createdAt === "string") {
                submittedAtIso = data.createdAt;
              }
            }

            results.push({
              id: docSnap.id,
              userId: ownerUid,
              role: "AMBULANCE_DRIVER",
              name: data.name || "Ambulance Driver",
              email: data.email || user?.email || null,
              phone: data.phone || user?.phone || null,
              crisisId: user?.crisisId || null,
              verificationStatus: canonicalStatus,
              submittedAt: submittedAtIso,
              details: {
                licenseNumber: data.licenseNumber || user?.licenseNumber || null,
                ambulanceId: data.ambulanceId || user?.ambulanceId || null,
                vehiclePlateNumber: data.vehiclePlateNumber || data.ambulanceId || user?.ambulanceId || null,
                ambulanceType: data.ambulanceType || "Basic Life Support (BLS)",
                hospitalId: data.hospitalId || null,
                hospitalName: data.hospitalName || "Independent Fleet",
              },
            });
          }
        } catch (err) {
          console.warn("[VerificationService] Firestore drivers hydration failed:", err);
        }
      }
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return results;
  }

  /**
   * Convenience helper for pending doctor applications.
   */
  public async listPendingDoctors(): Promise<PendingApplicationItem[]> {
    return this.listApplications({ role: "DOCTOR", status: "PENDING" });
  }


  /**
   * Reusable verification decision router across all roles.
   */
  public async verifyApplication(
    role: VerifiableRole,
    id: string,
    decision: "APPROVED" | "REJECTED",
    notes?: string
  ): Promise<PendingApplicationItem> {
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      throw new AppError(400, "INVALID_DECISION", "Decision must be 'APPROVED' or 'REJECTED'.");
    }

    if (role === "DOCTOR") {
      const updated = await doctorService.setVerificationStatus(
        id,
        decision === "APPROVED" ? "APPROVED" : "REJECTED"
      );

      const user = dataStore.users.get(updated.userId);

      return {
        id: updated.doctorId,
        userId: updated.userId,
        role: "DOCTOR",
        name: updated.name,
        email: user?.email || null,
        phone: user?.phone || null,
        crisisId: user?.crisisId || null,
        verificationStatus: decision,
        submittedAt: updated.createdAt || new Date().toISOString(),
        details: {
          specialty: updated.specialty,
          qualification: updated.qualification,
          licenseNumber: updated.licenseNumber,
          clinicId: updated.clinicId,
          consultationFee: updated.consultationFee,
          availability: updated.availability,
          adminNotes: notes || null,
        },
      };
    }

    if (role === "HOSPITAL") {
      if (!firestore) {
        throw new AppError(500, "FIREBASE_NOT_CONFIGURED", "Firebase is not configured.");
      }

      const hospitalRef = firestore.collection("hospitals").doc(id);
      const hospitalSnap = await hospitalRef.get();
      if (!hospitalSnap.exists) {
        throw new AppError(404, "HOSPITAL_NOT_FOUND", `Hospital with ID ${id} not found.`);
      }

      const hospData = hospitalSnap.data() as any;
      const now = new Date();

      await hospitalRef.update({
        verificationStatus: decision,
        updatedAt: now,
        verifiedAt: decision === "APPROVED" ? now : null,
      });

      // Update owner's user record in Firestore so their session & role reflect approval/rejection
      const ownerUid = hospData?.ownerUid;
      let user = ownerUid ? dataStore.users.get(ownerUid) : null;

      if (ownerUid) {
        try {
          const userRef = firestore.collection("users").doc(ownerUid);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const userData = userSnap.data() as any;
            const existingRoles: string[] = userData.roles && userData.roles.length > 0
              ? userData.roles
              : [userData.role || "PATIENT"];
            const combinedRoles = Array.from(new Set([...existingRoles, "HOSPITAL"]));
            const roleVerification = {
              ...(userData.roleVerificationStatus || {}),
              HOSPITAL: decision,
            };

            const updates: any = {
              roles: combinedRoles,
              roleVerificationStatus: roleVerification,
              updatedAt: now.toISOString(),
            };

            if (decision === "APPROVED" && userData.role !== "ADMIN") {
              updates.role = "HOSPITAL";
              updates.verificationStatus = "APPROVED";
            } else if (decision === "REJECTED" && userData.role === "HOSPITAL") {
              updates.verificationStatus = "REJECTED";
            }

            await userRef.set(updates, { merge: true });
            user = { ...userData, ...updates };
            dataStore.users.set(ownerUid, user);
          }
        } catch (err) {
          console.warn("[VerificationService] Failed to sync owner user profile:", err);
        }
      }

      let submittedAtIso = new Date().toISOString();
      if (hospData.createdAt) {
        if (typeof hospData.createdAt.toDate === "function") {
          submittedAtIso = hospData.createdAt.toDate().toISOString();
        } else if (typeof hospData.createdAt === "string") {
          submittedAtIso = hospData.createdAt;
        }
      }

      return {
        id,
        userId: ownerUid || "",
        role: "HOSPITAL",
        name: hospData.name || "Hospital Facility",
        email: hospData.email || user?.email || null,
        phone: hospData.phone || user?.phone || null,
        crisisId: user?.crisisId || null,
        verificationStatus: decision,
        submittedAt: submittedAtIso,
        details: {
          registrationNumber: hospData.registrationNumber || null,
          address: hospData.address || null,
          emergencyCapability: hospData.emergencyCapability || [],
          facilities: hospData.facilities || [],
          adminNotes: notes || null,
        },
      };
    }

    if (role === "AMBULANCE_DRIVER") {
      if (!firestore) {
        throw new AppError(500, "FIREBASE_NOT_CONFIGURED", "Firebase is not configured.");
      }

      const driverRef = firestore.collection("drivers").doc(id);
      const driverSnap = await driverRef.get();
      if (!driverSnap.exists) {
        throw new AppError(404, "DRIVER_NOT_FOUND", `Ambulance Driver with ID ${id} not found.`);
      }

      const driverData = driverSnap.data() as any;
      const now = new Date();

      await driverRef.update({
        verificationStatus: decision,
        updatedAt: now,
        verifiedAt: decision === "APPROVED" ? now : null,
      });

      // Update owner's user record in Firestore so their session & role reflect approval/rejection
      const ownerUid = driverData?.uid || id;
      let user = ownerUid ? dataStore.users.get(ownerUid) : null;

      if (ownerUid) {
        try {
          const userRef = firestore.collection("users").doc(ownerUid);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const userData = userSnap.data() as any;
            const existingRoles: string[] = userData.roles && userData.roles.length > 0
              ? userData.roles
              : [userData.role || "PATIENT"];
            const combinedRoles = Array.from(new Set([...existingRoles, "AMBULANCE_DRIVER"]));
            const roleVerification = {
              ...(userData.roleVerificationStatus || {}),
              AMBULANCE_DRIVER: decision,
            };

            const updates: any = {
              roles: combinedRoles,
              roleVerificationStatus: roleVerification,
              updatedAt: now.toISOString(),
            };

            if (decision === "APPROVED" && userData.role !== "ADMIN") {
              updates.role = "AMBULANCE_DRIVER";
              updates.verificationStatus = "APPROVED";
            } else if (decision === "REJECTED" && userData.role === "AMBULANCE_DRIVER") {
              updates.verificationStatus = "REJECTED";
            }

            await userRef.set(updates, { merge: true });
            user = { ...userData, ...updates };
            dataStore.users.set(ownerUid, user);
          }
        } catch (err) {
          console.warn("[VerificationService] Failed to sync driver owner user profile:", err);
        }
      }

      let submittedAtIso = new Date().toISOString();
      if (driverData.createdAt) {
        if (typeof driverData.createdAt.toDate === "function") {
          submittedAtIso = driverData.createdAt.toDate().toISOString();
        } else if (typeof driverData.createdAt === "string") {
          submittedAtIso = driverData.createdAt;
        }
      }

      return {
        id,
        userId: ownerUid || "",
        role: "AMBULANCE_DRIVER",
        name: driverData.name || "Ambulance Driver",
        email: driverData.email || user?.email || null,
        phone: driverData.phone || user?.phone || null,
        crisisId: user?.crisisId || null,
        verificationStatus: decision,
        submittedAt: submittedAtIso,
        details: {
          licenseNumber: driverData.licenseNumber || null,
          ambulanceId: driverData.ambulanceId || null,
          vehiclePlateNumber: driverData.vehiclePlateNumber || driverData.ambulanceId || null,
          ambulanceType: driverData.ambulanceType || "Basic Life Support (BLS)",
          hospitalId: driverData.hospitalId || null,
          hospitalName: driverData.hospitalName || "Independent Fleet",
          adminNotes: notes || null,
        },
      };
    }

    throw new AppError(400, "INVALID_ROLE", `Role '${role}' is not supported for verification.`);
  }
}

export const verificationService = new VerificationService();

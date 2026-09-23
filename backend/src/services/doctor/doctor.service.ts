import {
  DoctorProfile,
  RegisterDoctorRequest,
  DoctorVerificationStatus,
  DoctorAvailability,
  DoctorCardItem,
} from "../../types/doctor";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";
import { distanceService } from "../location/distance.service";
import { clinicService } from "./clinic.service";
import { firestore } from "../../config/firebase";

export class DoctorService {
  /**
   * Registers a new doctor into the Golden Hour network with initial PENDING status.
   */
  public async registerDoctor(data: RegisterDoctorRequest): Promise<DoctorProfile> {
    if (!data.userId || !data.name || !data.specialty || !data.licenseNumber || !data.clinicId) {
      throw new AppError(
        400,
        "MISSING_REQUIRED_FIELDS",
        "Required fields: userId, name, specialty, licenseNumber, clinicId."
      );
    }

    // Verify clinic exists
    await clinicService.getClinicById(data.clinicId);

    // Check duplicate license
    for (const doc of dataStore.doctors.values()) {
      if (doc.licenseNumber === data.licenseNumber) {
        throw new AppError(409, "DUPLICATE_LICENSE", "A doctor with this medical license is already registered.");
      }
    }

    const doctorId = data.doctorId || `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newDoctor: DoctorProfile = {
      doctorId,
      userId: data.userId,
      name: data.name,
      specialty: data.specialty,
      qualification: data.qualification || "MBBS",
      experienceYears: data.experienceYears || 1,
      licenseNumber: data.licenseNumber,
      verificationStatus: "PENDING", // Must be verified by admin before taking consultations
      clinicId: data.clinicId,
      consultationFee: data.consultationFee || 500,
      availability: "OFFLINE",
      rating: 5.0,
      servingToken: 0,
      queueLength: 0,
      estimatedWaitMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStore.doctors.set(doctorId, newDoctor);

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("doctors").doc(doctorId).set(newDoctor);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[doctor] Failed to sync doctor to Firestore:", err);
      }
    }

    return newDoctor;
  }

  /**
   * Updates verification status (admin action).
   */
  public async setVerificationStatus(
    doctorId: string,
    status: DoctorVerificationStatus
  ): Promise<DoctorProfile> {
    let doctor = dataStore.doctors.get(doctorId);

    // If not in memory (backend restarted), load from Firestore
    if (!doctor && firestore) {
      try {
        const snap = await firestore.collection("doctors").doc(doctorId).get();
        if (snap.exists) {
          doctor = snap.data() as DoctorProfile;
          if (doctor) dataStore.doctors.set(doctorId, doctor);
        }
      } catch {}
    }

    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    const canonicalStatus = (status === "APPROVED" ? "VERIFIED" : status) as DoctorVerificationStatus;
    if (!["PENDING", "VERIFIED", "REJECTED"].includes(canonicalStatus)) {
      throw new AppError(400, "INVALID_STATUS", "Status must be PENDING, VERIFIED, or REJECTED.");
    }

    doctor.verificationStatus = canonicalStatus;
    doctor.updatedAt = new Date().toISOString();

    if (canonicalStatus === "VERIFIED" && doctor.availability === "OFFLINE") {
      doctor.availability = "AVAILABLE";
    }
    if (canonicalStatus === "REJECTED") {
      doctor.availability = "OFFLINE";
    }

    dataStore.doctors.set(doctorId, doctor);

    // Also persist to Firestore
    if (firestore) {
      try {
        await firestore.collection("doctors").doc(doctorId).update({
          verificationStatus: canonicalStatus,
          availability: doctor.availability,
          updatedAt: doctor.updatedAt,
        });
      } catch (err) {
        console.warn("[doctor] Failed to sync verification status to Firestore:", err);
      }
    }

    if (doctor.userId) {
      const user = dataStore.users.get(doctor.userId);
      const approvedOrStatus = canonicalStatus === "VERIFIED" ? "APPROVED" : canonicalStatus;
      if (user) {
        user.roleVerificationStatus = {
          ...(user.roleVerificationStatus || {}),
          DOCTOR: approvedOrStatus,
        };
        if (user.role === "DOCTOR") {
          user.verificationStatus = approvedOrStatus;
        }
        dataStore.users.set(doctor.userId, user);
      }
      if (firestore && process.env.NODE_ENV !== "test") {
        try {
          await firestore.collection("users").doc(doctor.userId).update({
            verificationStatus: user?.verificationStatus || approvedOrStatus,
            roleVerificationStatus: user?.roleVerificationStatus || { DOCTOR: approvedOrStatus },
          });
        } catch {}
      }
    }

    return doctor;
  }

  /**
   * Updates doctor's availability (AVAILABLE, BUSY, OFFLINE).
   */
  public async setAvailability(doctorId: string, availability: DoctorAvailability): Promise<DoctorProfile> {
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    if (doctor.verificationStatus !== "VERIFIED" && availability === "AVAILABLE") {
      throw new AppError(403, "DOCTOR_NOT_VERIFIED", "Only verified doctors can set availability to AVAILABLE.");
    }

    if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(availability)) {
      throw new AppError(400, "INVALID_AVAILABILITY", "Availability must be AVAILABLE, BUSY, or OFFLINE.");
    }

    doctor.availability = availability;
    doctor.updatedAt = new Date().toISOString();
    dataStore.doctors.set(doctorId, doctor);
    return doctor;
  }

  /**
   * Finds doctor by ID.
   */
  public async getDoctorById(doctorId: string): Promise<DoctorCardItem> {
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    const clinic = dataStore.clinics.get(doctor.clinicId);
    return {
      ...doctor,
      clinic,
    };
  }

  /**
   * Finds doctor by userId (for logged in doctor profile).
   */
  public async getDoctorByUserId(userId: string): Promise<DoctorProfile> {
    for (const doc of dataStore.doctors.values()) {
      if (doc.userId === userId) {
        return doc;
      }
    }

    if (firestore) {
      try {
        const snap = await firestore.collection("doctors").where("userId", "==", userId).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0].data() as DoctorProfile;
          dataStore.doctors.set(doc.doctorId, doc);
          return doc;
        }

        const byDocId = await firestore.collection("doctors").doc(`doc-${userId}`).get();
        if (byDocId.exists) {
          const doc = byDocId.data() as DoctorProfile;
          dataStore.doctors.set(doc.doctorId, doc);
          return doc;
        }
      } catch {}
    }

    // Check if user is registered as DOCTOR in users table (in-memory or Firestore)
    let user = dataStore.users.get(userId);
    if (!user && firestore) {
      try {
        const uSnap = await firestore.collection("users").doc(userId).get();
        if (uSnap.exists) {
          user = uSnap.data();
          if (user) dataStore.users.set(userId, user);
        }
      } catch {}
    }

    if (user && (user.role === "DOCTOR" || (Array.isArray(user.roles) && user.roles.includes("DOCTOR")))) {
      const docId = `doc-${userId}`;
      const clinicId = user.clinicId || `clinic-${userId}`;

      if (!dataStore.clinics.has(clinicId)) {
        dataStore.clinics.set(clinicId, {
          clinicId,
          clinicName: user.clinicName || (user.name ? `${user.name}'s Clinic` : "Medical Clinic"),
          address: user.clinicAddress || "Civil Lines, Prayagraj",
          lat: typeof user.latitude === 'number' ? user.latitude : 25.4538,
          lng: typeof user.longitude === 'number' ? user.longitude : 81.8540,
          phone: user.phone || "+91-532-2400000",
          workingHours: "09:00 - 20:00",
          facilities: ["General OPD", "Consultation", "Emergency Dressing"],
        });
      }

      const docProfile: DoctorProfile = {
        doctorId: docId,
        userId,
        name: user.doctorName || user.name || "Doctor",
        specialty: user.specialty || user.specialization || "General Physician",
        qualification: user.qualification || "MBBS",
        experienceYears: Number(user.experienceYears) || 5,
        licenseNumber: user.licenseNumber || user.medicalRegistrationNumber || "UPMC-ACTIVE",
        verificationStatus: user.verificationStatus === "APPROVED" || process.env.NODE_ENV !== "production" ? "VERIFIED" : "PENDING",
        clinicId,
        consultationFee: user.consultationFee || 500,
        availability: "AVAILABLE",
        rating: 5.0,
        servingToken: 0,
        queueLength: 0,
        estimatedWaitMinutes: 0,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dataStore.doctors.set(docId, docProfile);
      return docProfile;
    }

    throw new AppError(404, "DOCTOR_NOT_FOUND", `No doctor profile associated with user ID '${userId}'.`);
  }

  /**
   * Updates doctor's profile.
   */
  public async updateProfile(doctorId: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile> {
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    // Prohibit tampering with verification status via standard profile update
    const { verificationStatus, doctorId: _id, userId: _uid, ...allowedUpdates } = updates;

    Object.assign(doctor, allowedUpdates, { updatedAt: new Date().toISOString() });
    dataStore.doctors.set(doctorId, doctor);
    return doctor;
  }

  /**
   * Searches and filters doctors with optional distance calculation from user coordinates.
   */
  public async searchDoctors(filters: {
    specialty?: string;
    availability?: DoctorAvailability;
    verifiedOnly?: boolean;
    userLat?: number;
    userLng?: number;
    maxDistanceKm?: number;
  }): Promise<DoctorCardItem[]> {
    // Sync any registered doctors from Firestore
    if (firestore) {
      try {
        const docSnaps = await firestore.collection("doctors").get();
        for (const snap of docSnaps.docs) {
          const docData = snap.data() as DoctorProfile;
          if (docData && docData.doctorId && !dataStore.doctors.has(docData.doctorId)) {
            if (!docData.clinicId || !dataStore.clinics.has(docData.clinicId)) {
              const clinicId = docData.clinicId || `clinic-${docData.doctorId}`;
              docData.clinicId = clinicId;
              if (!dataStore.clinics.has(clinicId)) {
                dataStore.clinics.set(clinicId, {
                  clinicId,
                  clinicName: (docData as any).clinicName || `${docData.name}'s Clinic`,
                  address: (docData as any).clinicAddress || "Civil Lines, Prayagraj",
                  lat: 25.4538,
                  lng: 81.8540,
                  phone: "+91-532-2400000",
                  workingHours: "09:00 - 20:00",
                  facilities: ["General OPD", "Consultation"],
                });
              }
            }
            dataStore.doctors.set(docData.doctorId, docData);
          }
        }

        const userSnaps = await firestore.collection("users").where("role", "==", "DOCTOR").get();
        for (const uSnap of userSnaps.docs) {
          const u = uSnap.data();
          const docId = `doc-${uSnap.id}`;
          if (!dataStore.doctors.has(docId)) {
            const clinicId = u.clinicId || `clinic-${uSnap.id}`;
            if (!dataStore.clinics.has(clinicId)) {
              dataStore.clinics.set(clinicId, {
                clinicId,
                clinicName: u.clinicName || (u.name ? `${u.name}'s Clinic` : "Medical Clinic"),
                address: u.clinicAddress || "Civil Lines, Prayagraj",
                lat: typeof u.latitude === 'number' ? u.latitude : 25.4538,
                lng: typeof u.longitude === 'number' ? u.longitude : 81.8540,
                phone: u.phone || "+91-532-2400000",
                workingHours: "09:00 - 20:00",
                facilities: ["General OPD", "Consultation"],
              });
            }
            dataStore.doctors.set(docId, {
              doctorId: docId,
              userId: uSnap.id,
              name: u.name || "Doctor",
              specialty: u.specialty || u.specialization || "General Physician",
              qualification: u.qualification || "MBBS",
              experienceYears: Number(u.experienceYears) || 5,
              licenseNumber: u.licenseNumber || u.medicalRegistrationNumber || "UPMC-ACTIVE",
              verificationStatus: u.verificationStatus === "APPROVED" || process.env.NODE_ENV !== "production" ? "VERIFIED" : "PENDING",
              clinicId,
              consultationFee: u.consultationFee || 500,
              availability: "AVAILABLE",
              rating: 5.0,
              servingToken: 0,
              queueLength: 0,
              estimatedWaitMinutes: 0,
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch {}
    }

    const results: DoctorCardItem[] = [];
    const seenDoctors = new Set<string>();

    for (const doc of dataStore.doctors.values()) {
      const dedupKey = `${doc.name.toLowerCase()}_${doc.specialty.toLowerCase()}`;
      if (seenDoctors.has(dedupKey) || seenDoctors.has(doc.doctorId)) {
        continue;
      }
      seenDoctors.add(dedupKey);
      seenDoctors.add(doc.doctorId);
      // Filter verified: default to true for patient consultations unless explicitly asked
      const verifiedOnly = filters.verifiedOnly !== false;
      if (verifiedOnly && doc.verificationStatus !== "VERIFIED" && process.env.NODE_ENV === "production") {
        continue;
      }

      // Filter specialty
      if (filters.specialty && !doc.specialty.toLowerCase().includes(filters.specialty.toLowerCase())) {
        continue;
      }

      // Filter availability
      if (filters.availability && doc.availability !== filters.availability) {
        continue;
      }

      const clinic = dataStore.clinics.get(doc.clinicId);
      let distanceKm: number | undefined;

      if (filters.userLat !== undefined && filters.userLng !== undefined && clinic) {
        distanceKm = distanceService.calculateDistance(filters.userLat, filters.userLng, clinic.lat, clinic.lng);
        if (filters.maxDistanceKm !== undefined && distanceKm > filters.maxDistanceKm) {
          continue;
        }
      }

      results.push({
        ...doc,
        distanceKm,
        clinic,
      });
    }

    // Sort by distance if location provided, else by rating
    if (filters.userLat !== undefined && filters.userLng !== undefined) {
      results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    } else {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results;
  }
}

export const doctorService = new DoctorService();

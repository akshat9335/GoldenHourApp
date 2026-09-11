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

    if (firestore) {
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
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    if (!["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
      throw new AppError(400, "INVALID_STATUS", "Status must be PENDING, VERIFIED, or REJECTED.");
    }

    doctor.verificationStatus = status;
    doctor.updatedAt = new Date().toISOString();

    if (status === "VERIFIED" && doctor.availability === "OFFLINE") {
      doctor.availability = "AVAILABLE";
    }

    dataStore.doctors.set(doctorId, doctor);
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
    const results: DoctorCardItem[] = [];

    for (const doc of dataStore.doctors.values()) {
      // Filter verified: default to true for patient consultations unless explicitly asked
      const verifiedOnly = filters.verifiedOnly !== false;
      if (verifiedOnly && doc.verificationStatus !== "VERIFIED") {
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

import { Request, Response, NextFunction } from "express";
import { doctorService } from "../services/doctor/doctor.service";
import { clinicService } from "../services/doctor/clinic.service";
import { travelService } from "../services/doctor/travel.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { validateCoordinates } from "../utils/geoutils";
import { DoctorAvailability, DoctorVerificationStatus } from "../types/doctor";

export class DoctorController {
  public async registerDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, specialty, qualification, experienceYears, licenseNumber, clinicId, consultationFee } = req.body;
      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication is required for doctor registration.");
      }

      const doctor = await doctorService.registerDoctor({
        userId,
        name,
        specialty,
        qualification,
        experienceYears: Number(experienceYears),
        licenseNumber,
        clinicId,
        consultationFee: consultationFee ? Number(consultationFee) : undefined,
      });

      sendSuccess(res, doctor, "Doctor registered successfully with PENDING verification", 201);
    } catch (err) {
      next(err);
    }
  }

  public async getDoctorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await doctorService.getDoctorById(req.params.id);
      sendSuccess(res, doctor, "Doctor profile retrieved");
    } catch (err) {
      next(err);
    }
  }

  public async getMyDoctorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
      }
      const doctor = await doctorService.getDoctorByUserId(userId);
      const clinic = await clinicService.getClinicById(doctor.clinicId);
      sendSuccess(res, { ...doctor, clinic }, "Your doctor profile retrieved");
    } catch (err) {
      next(err);
    }
  }

  public async updateMyDoctorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
      }
      const doctor = await doctorService.getDoctorByUserId(userId);
      const updated = await doctorService.updateProfile(doctor.doctorId, req.body);
      sendSuccess(res, updated, "Profile updated successfully");
    } catch (err) {
      next(err);
    }
  }

  public async updateMyAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.uid;
      const { availability } = req.body;

      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
      }

      const doctor = await doctorService.getDoctorByUserId(userId);
      const updated = await doctorService.setAvailability(doctor.doctorId, availability as DoctorAvailability);
      sendSuccess(res, updated, `Availability updated to ${availability}`);
    } catch (err) {
      next(err);
    }
  }

  public async verifyDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const updated = await doctorService.setVerificationStatus(
        req.params.id,
        status as DoctorVerificationStatus
      );
      sendSuccess(res, updated, `Doctor verification status set to ${status}`);
    } catch (err) {
      next(err);
    }
  }

  public async searchDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const specialty = req.query.specialty as string | undefined;
      const availability = req.query.availability as DoctorAvailability | undefined;
      const verifiedOnly = req.query.verifiedOnly !== "false";

      let userLat: number | undefined;
      let userLng: number | undefined;
      if (req.query.userLat && req.query.userLng) {
        userLat = parseFloat(req.query.userLat as string);
        userLng = parseFloat(req.query.userLng as string);
      }

      const doctors = await doctorService.searchDoctors({
        specialty,
        availability,
        verifiedOnly,
        userLat,
        userLng,
      });

      sendSuccess(res, doctors, `Found ${doctors.length} doctors matching criteria`);
    } catch (err) {
      next(err);
    }
  }

  public async getDoctorClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinic = await clinicService.getClinicForDoctor(req.params.id);
      sendSuccess(res, clinic, "Doctor clinic details retrieved");
    } catch (err) {
      next(err);
    }
  }

  public async getRouteToClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.userLat as string);
      const lng = parseFloat(req.query.userLng as string);

      if (!validateCoordinates(lat, lng)) {
        throw new AppError(400, "INVALID_COORDINATES", "Valid 'userLat' and 'userLng' query parameters required.");
      }

      const route = await travelService.getRouteToDoctorClinic(req.params.id, { lat, lng });
      sendSuccess(res, route, "Route to clinic calculated");
    } catch (err) {
      next(err);
    }
  }
}

export const doctorController = new DoctorController();

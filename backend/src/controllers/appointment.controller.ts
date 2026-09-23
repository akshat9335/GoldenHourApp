import { Request, Response, NextFunction } from "express";
import { appointmentService } from "../services/doctor/appointment.service";
import { travelService } from "../services/doctor/travel.service";
import { doctorService } from "../services/doctor/doctor.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { validateCoordinates } from "../utils/geoutils";

export class AppointmentController {
  public async createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId, patientName, date, timeSlot, notes } = req.body;
      const patientId = req.body.patientId || req.user?.uid || "demo-patient";

      if (!doctorId) {
        throw new AppError(400, "MISSING_DOCTOR_ID", "Doctor ID is required to book an appointment.");
      }

      const appointment = await appointmentService.createAppointment({
        doctorId,
        patientId,
        patientName: patientName || "Patient",
        date: date || new Date().toISOString().split("T")[0],
        timeSlot: timeSlot || "10:30 AM",
        notes,
      });

      sendSuccess(res, appointment, "Appointment booked successfully with token", 201);
    } catch (err) {
      next(err);
    }
  }

  public async getAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);
      sendSuccess(res, appointment, "Appointment details retrieved");
    } catch (err) {
      next(err);
    }
  }

  public async getMyAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user?.uid || (req.query.patientId as string);
      if (!patientId) {
        sendSuccess(res, [], "No active patient session");
        return;
      }

      const appointments = await appointmentService.getPatientAppointments(patientId);
      sendSuccess(res, appointments, `Retrieved ${appointments.length} appointments for patient`);
    } catch (err) {
      next(err);
    }
  }

  public async getDoctorAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.query.doctorId as string | undefined;

      if (!doctorId && req.user?.uid) {
        try {
          const doc = await doctorService.getDoctorByUserId(req.user.uid);
          doctorId = doc.doctorId;
        } catch {
          // If not linked by user id, allow explicit doctorId param
        }
      }

      if (!doctorId) {
        doctorId = "doc-1";
      }

      const date = req.query.date as string | undefined;
      const appointments = await appointmentService.getDoctorAppointments(doctorId, date);
      sendSuccess(res, appointments, `Retrieved ${appointments.length} appointments for doctor`);
    } catch (err) {
      next(err);
    }
  }

  public async startAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.startConsultation(req.params.id);
      sendSuccess(res, appointment, "Consultation marked IN_PROGRESS");
    } catch (err) {
      next(err);
    }
  }

  public async completeAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.completeConsultation(req.params.id);
      sendSuccess(res, appointment, "Consultation marked COMPLETED");
    } catch (err) {
      next(err);
    }
  }

  public async skipAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.skipAppointment(req.params.id);
      sendSuccess(res, appointment, "Appointment marked NO_SHOW");
    } catch (err) {
      next(err);
    }
  }

  public async cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.cancelAppointment(req.params.id);
      sendSuccess(res, appointment, "Appointment CANCELLED");
    } catch (err) {
      next(err);
    }
  }

  public async getRecommendedLeaveTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userLat = parseFloat(req.query.userLat as string);
      const userLng = parseFloat(req.query.userLng as string);
      const bufferMin = req.query.bufferMin ? parseInt(req.query.bufferMin as string, 10) : 10;

      if (!validateCoordinates(userLat, userLng)) {
        throw new AppError(400, "INVALID_COORDINATES", "Query params 'userLat' and 'userLng' must be valid coordinates.");
      }

      const recommendation = await travelService.getRecommendedLeaveTime(
        req.params.id,
        { lat: userLat, lng: userLng },
        bufferMin
      );

      sendSuccess(res, recommendation, "Recommended departure time calculated");
    } catch (err) {
      next(err);
    }
  }
}

export const appointmentController = new AppointmentController();

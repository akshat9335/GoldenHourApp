import { Appointment, AppointmentStatus, CreateAppointmentRequest } from "../../types/appointment";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";
import { queueService } from "./queue.service";
import { firestore } from "../../config/firebase";

export class AppointmentService {
  /**
   * Valid transition matrix for strict server-side state enforcement.
   */
  private readonly validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    BOOKED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["WAITING", "CANCELLED", "NO_SHOW"],
    WAITING: ["IN_PROGRESS", "NO_SHOW", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };

  /**
   * Books a new appointment with slot checking and atomic token issuance.
   */
  public async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    if (!data.doctorId || !data.patientId || !data.patientName || !data.date || !data.timeSlot) {
      throw new AppError(
        400,
        "MISSING_FIELDS",
        "Required: doctorId, patientId, patientName, date, timeSlot."
      );
    }

    const doctor = dataStore.doctors.get(data.doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${data.doctorId}' not found.`);
    }

    if (doctor.verificationStatus !== "VERIFIED") {
      throw new AppError(400, "DOCTOR_UNAVAILABLE", "Cannot book appointments with unverified doctors.");
    }

    // Check slot duplicate for the same patient & doctor on the same date
    for (const appt of dataStore.appointments.values()) {
      if (
        appt.doctorId === data.doctorId &&
        appt.date === data.date &&
        appt.timeSlot === data.timeSlot &&
        appt.status !== "CANCELLED"
      ) {
        throw new AppError(409, "SLOT_OCCUPIED", `Time slot '${data.timeSlot}' on ${data.date} is already booked.`);
      }

      if (
        appt.doctorId === data.doctorId &&
        appt.patientId === data.patientId &&
        appt.date === data.date &&
        appt.status !== "CANCELLED"
      ) {
        throw new AppError(409, "DUPLICATE_BOOKING", "Patient already has an active appointment with this doctor on this date.");
      }
    }

    // Generate atomic, duplicate-free token
    const tokenNumber = queueService.issueNextToken(data.doctorId, data.date);
    const appointmentId = `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newAppointment: Appointment = {
      appointmentId,
      patientId: data.patientId,
      patientName: data.patientName,
      doctorId: data.doctorId,
      clinicId: doctor.clinicId,
      date: data.date,
      timeSlot: data.timeSlot,
      tokenNumber,
      status: "CONFIRMED", // Default auto-confirmed upon valid token issuance
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStore.appointments.set(appointmentId, newAppointment);

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("appointments").doc(appointmentId).set(newAppointment);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[appointment] Failed to sync appointment to Firestore:", err);
      }
    }

    return newAppointment;
  }

  public async getAppointmentById(appointmentId: string): Promise<Appointment> {
    const appt = dataStore.appointments.get(appointmentId);
    if (!appt) {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", `Appointment '${appointmentId}' not found.`);
    }
    return appt;
  }

  public async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (const appt of dataStore.appointments.values()) {
      if (appt.patientId === patientId) {
        results.push(appt);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getDoctorAppointments(doctorId: string, date?: string): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (const appt of dataStore.appointments.values()) {
      if (appt.doctorId === doctorId && (!date || appt.date === date)) {
        results.push(appt);
      }
    }
    return results.sort((a, b) => a.tokenNumber - b.tokenNumber);
  }

  /**
   * Updates status with strict transition validation.
   */
  public async updateAppointmentStatus(
    appointmentId: string,
    nextStatus: AppointmentStatus
  ): Promise<Appointment> {
    const appt = await this.getAppointmentById(appointmentId);

    const allowed = this.validTransitions[appt.status];
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        `Invalid status transition from '${appt.status}' to '${nextStatus}'. Allowed: [${(allowed || []).join(", ")}]`
      );
    }

    appt.status = nextStatus;
    appt.updatedAt = new Date().toISOString();
    dataStore.appointments.set(appointmentId, appt);
    return appt;
  }

  public async startConsultation(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, "IN_PROGRESS");
  }

  public async completeConsultation(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, "COMPLETED");
  }

  public async skipAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, "NO_SHOW");
  }

  public async cancelAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, "CANCELLED");
  }
}

export const appointmentService = new AppointmentService();

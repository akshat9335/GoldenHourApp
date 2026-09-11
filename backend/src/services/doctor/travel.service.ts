import { Coordinates, RouteInfo } from "../../types/location";
import { TravelRecommendation } from "../../types/appointment";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";
import { mapsService } from "../location/maps.service";
import { parseTimeToMinutes, formatMinutesToTime } from "../../utils/geoutils";
import { queueService } from "./queue.service";

export class TravelService {
  /**
   * Calculates route from user's current location to a doctor's clinic.
   */
  public async getRouteToDoctorClinic(doctorId: string, userCoords: Coordinates): Promise<RouteInfo> {
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    const clinic = dataStore.clinics.get(doctor.clinicId);
    if (!clinic) {
      throw new AppError(404, "CLINIC_NOT_FOUND", `Clinic for doctor '${doctorId}' not found.`);
    }

    const destination: Coordinates = { lat: clinic.lat, lng: clinic.lng };
    return mapsService.getRoute(userCoords, destination);
  }

  /**
   * Computes synchronized Recommended Leave Time for an appointment.
   * Considers: Appointment Slot Time / Live Queue Delay, Traffic Travel Time, and a Safety Buffer.
   * Example: Appt 17:00, Travel 25m, Buffer 10m -> Recommended Leave 16:25.
   */
  public async getRecommendedLeaveTime(
    appointmentId: string,
    userCoords: Coordinates,
    safetyBufferMin = 10
  ): Promise<TravelRecommendation> {
    const appointment = dataStore.appointments.get(appointmentId);
    if (!appointment) {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", `Appointment '${appointmentId}' not found.`);
    }

    const doctor = dataStore.doctors.get(appointment.doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", "Doctor associated with this appointment was not found.");
    }

    const clinic = dataStore.clinics.get(appointment.clinicId);
    if (!clinic) {
      throw new AppError(404, "CLINIC_NOT_FOUND", "Clinic associated with this appointment was not found.");
    }

    // Get live route distance & duration
    const route = await mapsService.getRoute(userCoords, { lat: clinic.lat, lng: clinic.lng });
    const travelDurationMin = route.durationMin;

    // Fetch live queue delay if consultation date is today
    const today = new Date().toISOString().split("T")[0];
    let queueDelayMin = 0;

    if (appointment.date === today) {
      const queueView = await queueService.getLiveQueue(appointment.doctorId, appointment.tokenNumber);
      // If queue is running late, factor that into target time
      if (queueView.estimatedWaitMinutes > 0) {
        queueDelayMin = Math.min(queueView.estimatedWaitMinutes, 30); // Max 30m grace buffer
      }
    }

    // Appointment target minutes
    const appointmentMinutes = parseTimeToMinutes(appointment.timeSlot);
    const effectiveTargetMinutes = appointmentMinutes + queueDelayMin;

    // Recommended departure = TargetTime - TravelTime - Buffer
    const departureMinutes = effectiveTargetMinutes - travelDurationMin - safetyBufferMin;
    const recommendedDepartureTime = formatMinutesToTime(departureMinutes);

    return {
      appointmentId,
      doctorName: doctor.name,
      clinicName: clinic.clinicName,
      clinicAddress: clinic.address,
      appointmentTime: appointment.timeSlot,
      distanceKm: route.distanceKm,
      travelDurationMin,
      bufferMin: safetyBufferMin,
      recommendedDepartureTime,
      status: `Depart at ${recommendedDepartureTime} to arrive smoothly 10 minutes prior to consultation.`,
    };
  }
}

export const travelService = new TravelService();

import { ClinicDetails } from "../../types/doctor";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";

export class ClinicService {
  public async getClinicById(clinicId: string): Promise<ClinicDetails> {
    const clinic = dataStore.clinics.get(clinicId);
    if (!clinic) {
      throw new AppError(404, "CLINIC_NOT_FOUND", `Clinic with ID '${clinicId}' was not found.`);
    }
    return clinic;
  }

  public async getClinicForDoctor(doctorId: string): Promise<ClinicDetails> {
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' was not found.`);
    }
    return this.getClinicById(doctor.clinicId);
  }
}

export const clinicService = new ClinicService();

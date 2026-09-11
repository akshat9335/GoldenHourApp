import { LiveQueueState, PatientQueueView } from "../../types/appointment";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";

export class QueueService {
  /**
   * Retrieves or initializes today's queue for a given doctor.
   */
  public getOrCreateQueue(doctorId: string, date?: string): LiveQueueState {
    const queueDate = date || new Date().toISOString().split("T")[0];
    const key = `${doctorId}_${queueDate}`;

    let queue = dataStore.queues.get(key);
    if (!queue) {
      queue = {
        doctorId,
        date: queueDate,
        servingToken: 0,
        totalTokensIssued: 0,
        avgConsultationMinutes: 10,
        waitingCount: 0,
      };
      dataStore.queues.set(key, queue);
    }
    return queue;
  }

  /**
   * Generates the next atomic token for a doctor on a given date.
   * Guarantees zero duplicate tokens per doctor/date.
   */
  public issueNextToken(doctorId: string, date: string): number {
    const queue = this.getOrCreateQueue(doctorId, date);
    queue.totalTokensIssued += 1;
    queue.waitingCount += 1;
    dataStore.queues.set(`${doctorId}_${date}`, queue);
    return queue.totalTokensIssued;
  }

  /**
   * Gets live queue status for a patient or general viewer.
   */
  public async getLiveQueue(doctorId: string, patientToken?: number): Promise<PatientQueueView> {
    const doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", `Doctor with ID '${doctorId}' not found.`);
    }

    const clinic = dataStore.clinics.get(doctor.clinicId);
    const today = new Date().toISOString().split("T")[0];
    const queue = this.getOrCreateQueue(doctorId, today);

    const yourToken = patientToken || 0;
    const queueAhead = yourToken > queue.servingToken ? yourToken - queue.servingToken - 1 : 0;
    const estimatedWaitMinutes = queueAhead * queue.avgConsultationMinutes;

    return {
      doctorId,
      doctorName: doctor.name,
      clinicName: clinic?.clinicName || "Golden Hour Medical Center",
      servingToken: queue.servingToken,
      yourToken,
      queueAhead,
      estimatedWaitMinutes,
      status: queueAhead === 0 && yourToken > 0 ? "IN_PROGRESS" : "WAITING",
    };
  }

  /**
   * Advances the queue: calls next token.
   */
  public async advanceQueue(doctorId: string): Promise<LiveQueueState> {
    const today = new Date().toISOString().split("T")[0];
    const queue = this.getOrCreateQueue(doctorId, today);

    if (queue.servingToken >= queue.totalTokensIssued) {
      throw new AppError(400, "QUEUE_EMPTY", "No more patients waiting in the queue.");
    }

    queue.servingToken += 1;
    queue.waitingCount = Math.max(0, queue.waitingCount - 1);
    dataStore.queues.set(`${doctorId}_${today}`, queue);

    // Update doctor record
    const doctor = dataStore.doctors.get(doctorId);
    if (doctor) {
      doctor.servingToken = queue.servingToken;
      doctor.queueLength = queue.waitingCount;
      doctor.estimatedWaitMinutes = queue.waitingCount * queue.avgConsultationMinutes;
      dataStore.doctors.set(doctorId, doctor);
    }

    return queue;
  }
}

export const queueService = new QueueService();

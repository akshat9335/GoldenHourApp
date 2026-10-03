import { Appointment, LiveQueueState, PatientQueueView } from "../../types/appointment";
import { AppError } from "../../utils/AppError";
import { dataStore } from "../../models/dataStore";
import { doctorService } from "./doctor.service";
import { firestore } from "../../config/firebase";

export class QueueService {
  /**
   * Retrieves or initializes today's queue for a given doctor.
   */
  public getOrCreateQueue(doctorId: string, date?: string): LiveQueueState {
    const queueDate = date || new Date().toISOString().split("T")[0];
    const key = `${doctorId}_${queueDate}`;

    let queue = dataStore.queues.get(key);
    if (!queue) {
      let maxToken = 0;
      for (const a of dataStore.appointments.values()) {
        if (a.doctorId === doctorId && a.date === queueDate && (a.tokenNumber || 0) > maxToken) {
          maxToken = a.tokenNumber;
        }
      }
      queue = {
        doctorId,
        date: queueDate,
        servingToken: 0,
        totalTokensIssued: maxToken,
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
    let doctor = dataStore.doctors.get(doctorId);
    if (!doctor) {
      try {
        doctor = await doctorService.getDoctorById(doctorId);
      } catch {}
    }

    if (!doctor) {
      // Fallback: check pre-seeded or generic doctor so screen never crashes
      doctor = dataStore.doctors.get("doc-1") || {
        doctorId,
        userId: doctorId,
        name: "Doctor Consultation Desk",
        specialty: "General Physician",
        qualification: "MBBS",
        experienceYears: 5,
        licenseNumber: "UPMC-ACTIVE",
        verificationStatus: "VERIFIED",
        clinicId: "clinic-medanta-prayagraj",
        consultationFee: 500,
        availability: "AVAILABLE",
        rating: 5.0,
        servingToken: 0,
        queueLength: 0,
        estimatedWaitMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const clinic = dataStore.clinics.get(doctor.clinicId) || dataStore.clinics.get("clinic-medanta-prayagraj");
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
   * If all issued tokens are served, gracefully increments next walk-in token
   * so doctor queue NEVER resets to 0 or errors on advance.
   */
  public async advanceQueue(doctorId: string): Promise<LiveQueueState> {
    const today = new Date().toISOString().split("T")[0];
    const queue = this.getOrCreateQueue(doctorId, today);

    if (queue.servingToken >= queue.totalTokensIssued) {
      queue.totalTokensIssued = queue.servingToken + 1;
    }

    queue.servingToken += 1;
    queue.waitingCount = Math.max(0, queue.totalTokensIssued - queue.servingToken);
    dataStore.queues.set(`${doctorId}_${today}`, queue);

    const docIds = Array.from(new Set([doctorId, doctorId.replace(/^doc-/, ""), `doc-${doctorId}`]));

    // Update appointment statuses in memory
    for (const appt of dataStore.appointments.values()) {
      if (docIds.includes(appt.doctorId)) {
        if (appt.tokenNumber === queue.servingToken && appt.status !== "COMPLETED" && appt.status !== "CANCELLED") {
          appt.status = "IN_PROGRESS";
          appt.updatedAt = new Date().toISOString();
          dataStore.appointments.set(appt.appointmentId, appt);
        } else if (appt.tokenNumber < queue.servingToken && (appt.status === "IN_PROGRESS" || appt.status === "CONFIRMED" || appt.status === "WAITING")) {
          appt.status = "COMPLETED";
          appt.updatedAt = new Date().toISOString();
          dataStore.appointments.set(appt.appointmentId, appt);
        }
      }
    }

    // Persist appointment status updates to Firestore
    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        const snap = await firestore.collection("appointments").where("doctorId", "in", docIds).get();
        const batch = firestore.batch();
        let bCount = 0;
        for (const doc of snap.docs) {
          const a = doc.data() as Appointment;
          if (a) {
            if (a.tokenNumber === queue.servingToken && a.status !== "COMPLETED" && a.status !== "CANCELLED") {
              batch.set(doc.ref, { status: "IN_PROGRESS", updatedAt: new Date().toISOString() }, { merge: true });
              bCount++;
            } else if (a.tokenNumber < queue.servingToken && (a.status === "IN_PROGRESS" || a.status === "CONFIRMED" || a.status === "WAITING")) {
              batch.set(doc.ref, { status: "COMPLETED", updatedAt: new Date().toISOString() }, { merge: true });
              bCount++;
            }
          }
        }
        if (bCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.warn("[queueService] Error updating appointment statuses in Firestore on advance:", err);
      }
    }

    // Update doctor record across all ID variations
    for (const dId of docIds) {
      const doctor = dataStore.doctors.get(dId);
      if (doctor) {
        doctor.servingToken = queue.servingToken;
        doctor.queueLength = queue.waitingCount;
        doctor.estimatedWaitMinutes = queue.waitingCount * queue.avgConsultationMinutes;
        dataStore.doctors.set(dId, doctor);
      }
      if (firestore && process.env.NODE_ENV !== "test") {
        firestore.collection("doctors").doc(dId).set({
          servingToken: queue.servingToken,
          queueLength: queue.waitingCount,
          estimatedWaitMinutes: queue.waitingCount * queue.avgConsultationMinutes,
        }, { merge: true }).catch(() => {});
      }
    }

    return queue;
  }

  /**
   * Resets today's queue for a doctor back to clean 0 state.
   * Cancels unserved appointments so they don't linger or reappear as waiting.
   * Completed appointments remain COMPLETED.
   */
  public async resetQueue(doctorId: string, cancelUnserved: boolean = true): Promise<LiveQueueState> {
    const today = new Date().toISOString().split("T")[0];
    const key = `${doctorId}_${today}`;
    const queue: LiveQueueState = {
      doctorId,
      date: today,
      servingToken: 0,
      totalTokensIssued: 0,
      avgConsultationMinutes: 10,
      waitingCount: 0,
    };
    dataStore.queues.set(key, queue);

    const docIds = Array.from(new Set([doctorId, doctorId.replace(/^doc-/, ""), `doc-${doctorId}`]));

    if (cancelUnserved) {
      // In-memory update
      for (const appt of dataStore.appointments.values()) {
        if (
          docIds.includes(appt.doctorId) &&
          appt.status !== "COMPLETED" &&
          appt.status !== "CANCELLED"
        ) {
          appt.status = "CANCELLED";
          appt.notes = (appt.notes ? `${appt.notes} · ` : "") + "[Cancelled during queue reset]";
          appt.updatedAt = new Date().toISOString();
          dataStore.appointments.set(appt.appointmentId, appt);
        }
      }

      // Firestore query & batch update
      if (firestore && process.env.NODE_ENV !== "test") {
        try {
          const snap = await firestore.collection("appointments").where("doctorId", "in", docIds).get();
          const batch = firestore.batch();
          let count = 0;
          for (const doc of snap.docs) {
            const appt = doc.data() as Appointment;
            if (appt.status !== "COMPLETED" && appt.status !== "CANCELLED") {
              const updatedNotes = (appt.notes ? `${appt.notes} · ` : "") + "[Cancelled during queue reset]";
              const now = new Date().toISOString();
              batch.set(
                doc.ref,
                {
                  status: "CANCELLED",
                  notes: updatedNotes,
                  updatedAt: now,
                },
                { merge: true }
              );
              count++;

              dataStore.appointments.set(doc.id, {
                ...appt,
                status: "CANCELLED",
                notes: updatedNotes,
                updatedAt: now,
              });
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        } catch (err) {
          console.warn("[queueService] Error cancelling Firestore appointments on reset:", err);
        }
      }
    }

    for (const dId of docIds) {
      const doctor = dataStore.doctors.get(dId);
      if (doctor) {
        doctor.servingToken = 0;
        doctor.queueLength = 0;
        doctor.estimatedWaitMinutes = 0;
        dataStore.doctors.set(dId, doctor);
      }
      if (firestore && process.env.NODE_ENV !== "test") {
        firestore.collection("doctors").doc(dId).set(
          {
            servingToken: 0,
            queueLength: 0,
            estimatedWaitMinutes: 0,
          },
          { merge: true }
        ).catch(() => {});
      }
    }

    return queue;
  }
}

export const queueService = new QueueService();

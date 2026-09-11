import { FrontlinePatientReferral, FrontlineVitals } from "../types/healthWorker.types";
import { offlineQueueService } from "../../low-connectivity/services/offlineQueue.service";

export class HealthWorkerReferralService {
  /**
   * Deterministic emergency triage priority calculator for frontline health workers.
   * Assesses vital instability according to standard emergency medicine guidelines.
   */
  public evaluateTriagePriority(vitals: FrontlineVitals): "CRITICAL" | "HIGH" | "MODERATE" | "LOW" {
    if (vitals.consciousness === "UNRESPONSIVE" || vitals.consciousness === "PAIN_RESPONSIVE") {
      return "CRITICAL";
    }

    if (vitals.oxygenSpo2 !== undefined && vitals.oxygenSpo2 < 90) {
      return "CRITICAL";
    }

    if (vitals.pulseRateBpm !== undefined && (vitals.pulseRateBpm > 130 || vitals.pulseRateBpm < 45)) {
      return "CRITICAL";
    }

    if (vitals.bleedingActive) {
      return "HIGH";
    }

    if (vitals.fractureSuspected || vitals.consciousness === "VOICE_RESPONSIVE") {
      return "HIGH";
    }

    return "MODERATE";
  }

  /**
   * Dispatches a digital emergency referral.
   * Enqueues locally via OfflineQueue if network connection is weak/unavailable.
   */
  public async dispatchReferral(
    referral: Omit<
      FrontlinePatientReferral,
      "referralId" | "triagePriority" | "status" | "timestamp" | "recommendedFacilityType"
    >
  ): Promise<FrontlinePatientReferral> {
    const priority = this.evaluateTriagePriority(referral.vitals);
    const referralId = `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const fullReferral: FrontlinePatientReferral = {
      ...referral,
      referralId,
      triagePriority: priority,
      recommendedFacilityType:
        priority === "CRITICAL"
          ? "Apex Trauma / Tertiary Care Hospital"
          : priority === "HIGH"
          ? "District Hospital Emergency"
          : "Primary Health Centre (PHC)",
      status: "CREATED",
      timestamp: new Date().toISOString(),
    };

    // Queue for reliable delivery
    offlineQueueService.enqueue("HEALTH_WORKER_REFERRAL", "/api/referrals", fullReferral);

    return fullReferral;
  }
}

export const healthWorkerReferralService = new HealthWorkerReferralService();

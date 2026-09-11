export type SyncStatus = "SYNCED" | "WAITING_FOR_CONNECTION" | "SYNCING" | "FAILED";

export type OfflinePayloadType =
  | "SOS_TRIGGER"
  | "ACCIDENT_REPORT"
  | "PATIENT_VITALS"
  | "HEALTH_WORKER_REFERRAL"
  | "LOCATION_UPDATE";

export interface QueuedEmergencyItem {
  id: string;
  payloadType: OfflinePayloadType;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  payload: Record<string, any>;
  createdAt: string;
  retryAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}
